let map;
let polygons = [];
let infoWindow;
let areas = [];
let workLocationCoords = null;

let selectedTransport = "car";
let maxTravelTime = null;
let minPrice = null;
let maxPrice = null;

/* ==============================
   OMRÅDEDATA
============================== */

async function loadAreas() {

    try {

        const response = await fetch(
            "https://api.npoint.io/53863a384ef34a51ac0f"
        );

        areas = await response.json();

        console.log("Areas loaded:", areas);

    } catch (error) {

        console.error(
            "Kunne ikke hente områder:",
            error
        );
    }
}

async function geocodeWorkLocation(address) {

    const geocoder =
        new google.maps.Geocoder();

    return new Promise((resolve, reject) => {

        geocoder.geocode(
            { address: address },

            (results, status) => {

                if (
                    status === "OK" &&
                    results[0]
                ) {

                    const location =
                        results[0].geometry.location;

                    resolve({
                        lat: location.lat(),
                        lng: location.lng()
                    });

                } else {

                    reject(
                        "Fant ikke adresse"
                    );
                }
            }
        );
    });
}

/* ==============================
   INIT MAP
============================== */

window.initMap = async function () {

    const bergen = {
        lat: 60.3913,
        lng: 5.3221
    };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: bergen,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
    });

    infoWindow = new google.maps.InfoWindow();
    await loadAreas();

};

/* ==============================
   TEGN OMRÅDER
============================== */

function drawAreas(colorFunc, inputareas = null) {
    if (!inputareas) {
        inputareas = areas;
    }
    // Fjern gamle polygoner
    polygons.forEach(polygon => polygon.setMap(null));
    polygons = [];

    inputareas.forEach(area => {

        const polygon = new google.maps.Polygon({
            paths: area.coords,

            fillColor: colorFunc
                ? colorFunc(area)
                : "#cccccc",

            fillOpacity: 0.45,

            strokeColor: "#2F6B4F",
            strokeOpacity: 1,
            strokeWeight: 2
        });

        polygon.setMap(map);

        polygon.addListener("click", (event) => {
            showInfo(area, event.latLng);
        });

        polygons.push(polygon);
    });
}

/* ==============================
   Finne reisetid mellom jobb og områder
============================== */

async function getTravelTimes(
    originLat,
    originLng,
    destinationLat,
    destinationLng
) {
    const endpoint =
        "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";

    const modes = {
        car: "DRIVE",
        transit: "TRANSIT",
        walk: "WALK"
    };

    const results = {};

    // Neste mandag kl 09:00
    const transitDepartureTime = getNextMondayAt9AM();

    for (const [label, travelMode] of Object.entries(modes)) {
        const body = {
            origins: [
                {
                    waypoint: {
                        location: {
                            latLng: {
                                latitude: originLat,
                                longitude: originLng
                            }
                        }
                    }
                }
            ],
            destinations: [
                {
                    waypoint: {
                        location: {
                            latLng: {
                                latitude: destinationLat,
                                longitude: destinationLng
                            }
                        }
                    }
                }
            ],
            travelMode,
            languageCode: "no"
        };

        // Transit krever departureTime
        if (travelMode === "TRANSIT") {
            body.departureTime = transitDepartureTime;
        }

        // Trafikk-aware routing for bil
        if (travelMode === "DRIVE") {
            body.routingPreference = "TRAFFIC_AWARE";
            body.departureTime = new Date(
                Date.now() + 2 * 60 * 1000
            ).toISOString();
        }

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": "AIzaSyBFkMoWM4aP5EWSQ1Q2AjPfZwws7PoQ4G0",
                "X-Goog-FieldMask":
                    "originIndex,destinationIndex,duration,distanceMeters,status"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(
                `Google API error (${travelMode}): ${response.status}`
            );
        }
        const route = (await response.json())[0];
        const durationSeconds = parseDuration(route.duration);

        results[label] = {
            seconds: durationSeconds,
            minutes: Math.round(durationSeconds / 60),
            distanceMeters: route.distanceMeters,
            readable: formatDuration(durationSeconds)
        };
    }

    return results;
}

function getNextMondayAt9AM() {
    const now = new Date();

    // Start med dagens dato
    const result = new Date(now);

    const currentDay = result.getDay();

    // Finn dager til neste mandag
    let daysUntilMonday = (8 - currentDay) % 7;

    // ALLTID neste mandag
    if (daysUntilMonday === 0) {
        daysUntilMonday = 7;
    }

    result.setDate(result.getDate() + daysUntilMonday);

    // Sett lokal tid 09:00
    result.setHours(9, 0, 0, 0);

    return result.toISOString();
}

function parseDuration(durationString) {
    return Number(durationString.replace("s", ""));
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours} t ${minutes} min`;
    }

    return `${minutes} min`;
}

/* ==============================
   FILTER
============================== */

async function applyFilter(workLocationCoords) {
    // filters:
    // 1. Reisetif
    // 2. Budsjett
    // 3. Nærhet til X


    const checkboxes = document.querySelectorAll(
        'input[name="fasiliteter"]:checked'
    );

    // Finne reisetider for alle areas

    let filteredAreas = [];
    for (let area in areas) {
        const areaData = areas[area];
        const areaDistance = await getTravelTimes(areaData.center.lat, areaData.center.lng, workLocationCoords.lat, workLocationCoords.lng);
        filteredAreas.push([areaData, areaDistance]);
    }
    console.log("areaswithdistance", filteredAreas);


    // finne valgt max reisetid dersom den er valgt
    const maxReisetidSelect = document.getElementById("max-reisetid");
    const maxTravelTime = Number(maxReisetidSelect.value);
    const selectedTransport = document.querySelector(
        'input[name="transport"]:checked'
    )?.value;
    if (maxTravelTime && selectedTransport) {
        console.log("selectedMode", selectedTransport)
        console.log("maxtime", maxTravelTime)
        // Get selected travel mode from
        filteredAreas = filteredAreas.filter(a => {
            const travelTimes = a[1];
            if (selectedTransport == "buss") {
                const bussResult = maxTravelTime >= travelTimes.transit.minutes;
                console.log(a[0].name, "buss", travelTimes.transit, bussResult);
                return bussResult;
            }
            if (selectedTransport == "bil") {
                const bilResult = maxTravelTime >= travelTimes.car.minutes;
                console.log(a[0].name, "bil", travelTimes.car, bilResult);
                return bilResult;
            }
            if (selectedTransport == "gå") {
                const walkResult = maxTravelTime >= travelTimes.walk.minutes;
                console.log(a[0].name, "gå", travelTimes.walk, walkResult);
                return walkResult;
            }

        })
    }
    console.log("filteredDistenace", filteredAreas);


    // hent max / min pris
    const min = Number(
        document.getElementById("min-price").value
    );

    const max = Number(
        document.getElementById("max-price").value
    );
    console.log("maxmin", min, max)
    // getbyid value for max / min
    if (max && min) {
        filteredAreas = filteredAreas.filter(a => {
            const areaInfo = a[0];
            const price = areaInfo.data.priceValue;
            return (min <= price && max >= price)
        })
    }
    console.log("filteredbypriceanddisance", filteredAreas);
    const filters = Array.from(checkboxes).map(cb => cb.value);

    console.log("filters", filters)

    // Ingen filter valgt
    if (filters.length === 0) {

        polygons.forEach(polygon => polygon.setMap(null));
        polygons = [];

        return;
    }

    let bestScore = -1;

    // Finn beste score
    filteredAreas.map(a => a[0]).forEach(area => {

        const score = calculateScore(area, filters);

        if (score > bestScore) {
            bestScore = score;
        }
    });

    // Tegn med farger
    drawAreas(area => {

        const score = calculateScore(area, filters);

        if (score === bestScore) {
            return "#3DC485"; // grønn
        }

        if (score >= bestScore * 0.6) {
            return "#FFD26B"; // gul/orange
        }

        return "#F4665B"; // rød
    }, filteredAreas.map(a => a[0]));
}

function calculateDistance(
    lat1,
    lng1,
    lat2,
    lng2
) {

    const R = 6371;

    const dLat =
        (lat2 - lat1) * Math.PI / 180;

    const dLng =
        (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *

        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}

/* ==============================
   SCORE SYSTEM
============================== */

function calculateScore(area, filters) {

    let score = 0;

    // Prisfilter
    if (
        minPrice &&
        area.data.priceValue < minPrice
    ) {
        return -999;
    }

    if (
        maxPrice &&
        area.data.priceValue > maxPrice
    ) {
        return -999;
    }

    filters.forEach(filter => {

        switch (filter) {

            case "kollektiv":
                score += area.data.transport;
                break;

            case "skole":
                score += area.data.school;
                break;

            case "matbutikk":
                score += area.data.shop;
                break;

            case "barnehage":
                score += area.data.kindergarten;
                break;

            case "apotek":
                score += area.data.pharmacy;
                break;
        }
    });
    if (workLocationCoords) {

        const distance =
            calculateDistance(
                workLocationCoords.lat,
                workLocationCoords.lng,
                area.center.lat,
                area.center.lng
            );

        let multiplier = 1;

        switch (selectedTransport) {

            case "gå":
                multiplier = 12;
                break;

            case "buss":
                multiplier = 3;
                break;

            case "bil":
                multiplier = 1.5;
                break;
        }

        const estimatedMinutes =
            distance * multiplier;

        if (
            maxTravelTime &&
            estimatedMinutes > maxTravelTime
        ) {
            return -999;
        }

        score += Math.max(
            0,
            30 - estimatedMinutes
        );
    }

    return score;
}

/* ==============================
   INFO WINDOW
============================== */

function showInfo(area, position) {

    const content = `
        <div style="padding: 8px; min-width: 220px;">
            <h3 style="margin-bottom: 10px;">
                ${area.name}
            </h3>

            <p><strong>Prisnivå:</strong> ${area.data.price}/10</p>
            <p><strong>Kollektiv:</strong> ${area.data.transport}/10</p>
            <p><strong>Skole:</strong> ${area.data.school}/10</p>
            <p><strong>Matbutikk:</strong> ${area.data.shop}/10</p>

            <br>

            <p>${generateSummary(area)}</p>
        </div>
    `;

    infoWindow.setContent(content);

    infoWindow.setPosition(position);

    infoWindow.open(map);
}

/* ==============================
   AUTOMATISK BESKRIVELSE
============================== */

function generateSummary(area) {

    if (
        area.data.price < 5 &&
        area.data.transport > 7
    ) {
        return "Et rimelig område med svært god kollektivdekning.";
    }

    if (
        area.data.school > 8 &&
        area.data.kindergarten > 7
    ) {
        return "Perfekt for familier med gode skoler og barnehager.";
    }

    if (
        area.data.shop > 8 &&
        area.data.transport > 8
    ) {
        return "Sentralt område med mange fasiliteter i nærheten.";
    }

    return "Et balansert område med gode fasiliteter.";
}

/* ==============================
   EVENTS
============================== */

document.addEventListener("DOMContentLoaded", () => {

    const transportButtons =
        document.querySelectorAll(
            ".fremkomst-icon"
        );

    transportButtons.forEach(button => {

        button.addEventListener("click", () => {

            selectedTransport =
                button.dataset.transport;

            console.log(selectedTransport);
        });
    });

    // Checkbox-filter
    const checkboxes = document.querySelectorAll(
        'input[name="fasiliteter"]'
    );

    checkboxes.forEach(checkbox => {

        checkbox.addEventListener("change", () => {
            //applyFilter();
        });
    });

    // Søk-knapp
    const searchButton = document.querySelector(
        ".btn--primary"
    );

    if (searchButton) {

        searchButton.addEventListener(
            "click",

            async () => {

                const input =
                    document.getElementById(
                        "work-location"
                    );

                const address = input.value;

                maxTravelTime = Number(
                    document.querySelector("select").value
                );

                minPrice = Number(
                    document.querySelector(
                        'input[placeholder="Min pris"]'
                    ).value
                );

                maxPrice = Number(
                    document.querySelector(
                        'input[placeholder="Max pris"]'
                    ).value
                );

                if (address) {

                    try {

                        workLocationCoords =
                            await geocodeWorkLocation(
                                address
                            );

                        console.log(
                            "Arbeidssted:",
                            workLocationCoords
                        );

                        new google.maps.Marker({
                            position: workLocationCoords,
                            map: map,
                            title: "Arbeidssted"
                        });

                        map.panTo(workLocationCoords);

                        map.setZoom(13);

                        await applyFilter(workLocationCoords);

                    } catch (error) {

                        console.log(error);
                        alert(
                            "Fant ikke arbeidssted"
                        );

                        return;
                    }
                }

            }
        );
    }

    // Nullstill filter
    const resetButton = document.querySelector(
        ".btn--secondary"
    );

    if (resetButton) {

        resetButton.addEventListener("click", () => {

            const checkboxes = document.querySelectorAll(
                'input[name="fasiliteter"]'
            );

            checkboxes.forEach(cb => {
                cb.checked = false;
            });

            drawAreas(() => "#cccccc");
        });
    }
});
let map;
let polygons = [];
let infoWindow;
let areas = [];
let workLocationCoords = null;

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

function drawAreas(colorFunc) {

    // Fjern gamle polygoner
    polygons.forEach(polygon => polygon.setMap(null));
    polygons = [];

    areas.forEach(area => {

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
   FILTER
============================== */

function applyFilter() {

    const checkboxes = document.querySelectorAll(
        'input[name="fasiliteter"]:checked'
    );

    const filters = Array.from(checkboxes).map(cb => cb.value);

    // Ingen filter valgt
    if (filters.length === 0) {

        polygons.forEach(polygon => polygon.setMap(null));
        polygons = [];

        return;
    }

    let bestScore = -1;

    // Finn beste score
    areas.forEach(area => {

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
    });
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

    if(workLocationCoords) {

    const distance =
        calculateDistance(
            workLocationCoords.lat,
            workLocationCoords.lng,
            area.center.lat,
            area.center.lng
        );

    // Kortere avstand = høyere score
    score += Math.max(
        0,
        15 - distance
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

    // Checkbox-filter
    const checkboxes = document.querySelectorAll(
        'input[name="fasiliteter"]'
    );

    checkboxes.forEach(checkbox => {

        checkbox.addEventListener("change", () => {
            applyFilter();
        });
    });

    // Søk-knapp
    const searchButton = document.querySelector(
        ".btn--primary"
    );

    if (searchButton) {

        searchButton.addEventListener("click",
            async () => {
                const input =
            document.getElementById(
                "work-location"
            );

        const address = input.value;

        if(address) {

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

            } catch(error) {

                alert(
                    "Fant ikke arbeidssted"
                );

                return;
            }
        }
            applyFilter();
        });
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
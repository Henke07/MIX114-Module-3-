let map;
let polygons = [];
let infoWindow;
let areas = [];
let workLocationCoords = null;

let selectedTransport = "car";
let maxTravelTime = null;
let minPrice = null;
let maxPrice = null;
let activeFilters= [];

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
   CALL OPENAI

async function callOpenAI(prompt) {

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + API_KEY
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Du er en norsk boligrådgiver. Svar kun med JSON."
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        })
    });

    const data = await response.json();
    const text = data.choices[0].message.content;
    return JSON.parse(text);
}

/* ==============================
   BUILD PROMPT

function buildPrompt() {

    const arbeidssted = document.getElementById("input-arbeidssted").value || "ikke oppgitt";
    const activeTransport = document.querySelector(".fremkomst-icon.active");
    const transportmiddel = activeTransport ? activeTransport.getAttribute("aria-label") : "ikke oppgitt";
    const reisetid = document.getElementById("input-reisetid").value || "ikke oppgitt";
    const budsjettMin = document.getElementById("input-budsjett-min").value || "ikke oppgitt";
    const budsjettMax = document.getElementById("input-budsjett-max").value || "ikke oppgitt";

    const checkboxes = document.querySelectorAll('input[name="fasiliteter"]:checked');
    const fasiliteter = Array.from(checkboxes).map(cb => cb.value);
    const fasiliteterTekst = fasiliteter.length > 0 ? fasiliteter.join(", ") : "ingen valgt";

    const omraadeData = JSON.stringify(areas.map(a => ({
        name: a.name,
        data: a.data
    })));

    return `
Du er en norsk boligrådgiver med god kjennskap til Bergen og dens nabolag.

Brukeren jobber på: ${arbeidssted}
Bruk din kunnskap om Bergens geografi til å vurdere hvor nært eller langt hvert nabolag er fra denne adressen, og ta hensyn til dette i rangeringen.

Brukerens øvrige preferanser:
- Transportmiddel: ${transportmiddel}
- Maks reisetid: ${reisetid} minutter
- Budsjett: ${budsjettMin} – ${budsjettMax} NOK
- Viktige fasiliteter: ${fasiliteterTekst}

Her er nabolagsdataen:
${omraadeData}

Ranger nabolagene fra best til dårligst match. Ta hensyn til både geografisk nærhet til arbeidsstedet og de øvrige preferansene.
Svar KUN med et JSON-array i dette formatet, ingen annen tekst:
[
  {
    "name": "Navn på nabolag",
    "score": 85,
    "pros": ["Fordel 1", "Fordel 2"],
    "cons": ["Ulempe 1"],
    "summary": "Kort forklaring på norsk som nevner reisetid fra arbeidsstedet"
  }
]
    `.trim();
}

/* ==============================
   RENDER RESULTS

let lastResults = [];

function renderResults(results) {

    lastResults = results;
    localStorage.setItem("lastResults", JSON.stringify(results));

    const container = document.querySelector(".best-matches");

    container.innerHTML = `
        <div class="best-matches-header">
            <h2>Dine beste matcher er:</h2>
            <p>Viser ${results.length} områder</p>
        </div>
        ${results.map((area, index) => `
            <div class="best-matches-card">

                <div class="best-matches-card-img">
                    <img src="" alt="Bilde av ${area.name}">
                </div>

                <div class="best-matches-card-content">
                    <div class="card-content-title">
                        <h3>${area.name}</h3>
                    </div>

                    <p>${area.summary}</p>

                    <div class="card-content-attriubutes">
                        <div class="attributes-pros">
                            <div class="attributes-pros-title">Fordeler</div>
                            <ul class="attributes-pros-list">
                                ${area.pros.map(p => `<li>${p}</li>`).join("")}
                            </ul>
                        </div>
                        <div class="attributes-cons">
                            <div class="attributes-cons-title">Ulemper</div>
                            <ul class="attributes-cons-list">
                                ${area.cons.map(c => `<li>${c}</li>`).join("")}
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="best-matches-card-buttons">
                    <div class="card-btn-group">
                        <button class="card-btn-add" data-index="${index}" aria-label="Legg til i sammenligning">+</button>
                        <span class="card-btn-label" data-label="${index}">Legg til</span>
                    </div>
                    <button class="card-btn-heart" aria-label="Lagre">♡</button>
                    <div class="card-match-badge">
                        <span class="card-match-percentage">${area.score}%</span>
                        <span>Match</span>
                    </div>
                </div>

            </div>
        `).join("")}
    `;

    container.querySelectorAll(".card-btn-add").forEach(btn => {
        btn.addEventListener("click", () => {
            addToComparison(lastResults[btn.dataset.index], btn);
        });
    });
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
    maxTravelTime = Number(maxReisetidSelect.value);
    selectedTransport = document.querySelector(
        'input[name="transport"]:checked'
    )?.value;

    console.log("filteredDistenace", filteredAreas);


    console.log("filteredbypriceanddisance", filteredAreas);
    const filters = Array.from(checkboxes).map(cb => cb.value);
    activeFilters = filters;

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

        // Normaliser score mellom 0 og 1
        if (score >= 85) {
            return "#3DC485"; // grønn
        }

        if (score >= 65) {
            return "#FFD26B"; // gul
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
    let maxScore = 0;
    if (minPrice && area.data.priceValue < minPrice) {
        score -= 15;
    }

    if (maxPrice && area.data.priceValue > maxPrice) {
        score -= 15;
    }

    filters.forEach(filter => {

        maxScore += 10; // hvert kriterium er av 10

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

    // Reisetid bonus
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
            score -= 25;
        }

        // Gi opptil 10 poeng for kort reisetid
        const travelScore = Math.max(
            0,
            20 - (estimatedMinutes / 5)
        );

        score += travelScore;
        maxScore += 20;
    }

    // Unngå deling på 0
    if (maxScore === 0) {
        return 0;
    }

    // Returner prosent
    return Math.round((score / maxScore) * 100);
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
            <p><strong>Match:</strong> ${calculateScore(area, activeFilters)}%</p>

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
   COMPARISON
============================== */

let selectedAreas = [];

function addToComparison(area, btn) {

    const alreadyAdded = selectedAreas.find(a => a.name === area.name);
    const label = document.querySelector(`.card-btn-label[data-label="${btn.dataset.index}"]`);

    if (alreadyAdded) {
        selectedAreas = selectedAreas.filter(a => a.name !== area.name);
        btn.textContent = "+";
        btn.classList.remove("card-btn-add--active");
        if (label) label.textContent = "Legg til";
    } else {
        if (selectedAreas.length >= 2) {
            alert("Du kan bare sammenligne 2 områder. Fjern ett først.");
            return;
        }
        selectedAreas.push(area);
        btn.textContent = "−";
        btn.classList.add("card-btn-add--active");
        if (label) label.textContent = "Fjern";
    }

    localStorage.setItem("comparisonAreas", JSON.stringify(selectedAreas));
    updateCompareButton();
}

function updateCompareButton() {

    let btn = document.getElementById("compare-button");

    if (selectedAreas.length === 0) {
        if (btn) btn.remove();
        return;
    }

    if (!btn) {
        btn = document.createElement("button");
        btn.id = "compare-button";
        btn.className = "btn btn--primary";
        btn.addEventListener("click", () => {
            window.location.href = "comparison.html";
        });
        document.querySelector(".best-matches").appendChild(btn);
    }

    btn.textContent = `Sammenlign ${selectedAreas.length}/2 områder →`;
}

/* ==============================
   EVENTS
============================== */

document.addEventListener("DOMContentLoaded", () => {

    const savedResults = localStorage.getItem("lastResults");
    if (savedResults) {
        renderResults(JSON.parse(savedResults));
    }

    const savedComparison = localStorage.getItem("comparisonAreas");
    if (savedComparison) {
        selectedAreas = JSON.parse(savedComparison);
        updateCompareButton();
    }

    // Transport buttons
    document.querySelectorAll(".fremkomst-icon").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".fremkomst-icon").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
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
        searchButton.addEventListener("click", async () => {
            applyFilter();

            selectedAreas = [];
            localStorage.removeItem("comparisonAreas");
            const existingBtn = document.getElementById("compare-button");
            if (existingBtn) existingBtn.remove();

            const container = document.querySelector(".best-matches");
            container.innerHTML = `
                <div class="loading-state">
                    <span class="loading-spinner" aria-hidden="true"></span>
                    <p>Finner dine beste matcher...</p>
                </div>
            `;

            const prompt = buildPrompt();
            const results = await callOpenAI(prompt);
            renderResults(results);
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
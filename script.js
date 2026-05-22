let map;
let polygons = [];
let infoWindow;
let areas = [];
let workLocationCoords = null;

let selectedTransport = "bil";
let maxTravelTime = null;
let minPrice = null;
let maxPrice = null;
let activeFilters = [];

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

    const geocoder = new google.maps.Geocoder();

    return new Promise((resolve, reject) => {

        geocoder.geocode({ address: address }, (results, status) => {

            if (status === "OK" && results[0]) {

                const location = results[0].geometry.location;

                resolve({
                    lat: location.lat(),
                    lng: location.lng()
                });

            } else {

                reject("Fant ikke adresse");
            }
        });
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

    if (!inputareas) inputareas = areas;

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
   CALL OPENAI
============================== */

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
============================== */

function buildPrompt() {

    const arbeidssted = document.getElementById("work-location").value || "ikke oppgitt";
    const activeTransport = document.querySelector('input[name="transport"]:checked');
    const transportmiddel = activeTransport ? activeTransport.value : "ikke oppgitt";
    const reisetid = document.getElementById("input-reisetid").value || "ikke oppgitt";
    const budsjettMin = document.getElementById("min-price").value || "ikke oppgitt";
    const budsjettMax = document.getElementById("max-price").value || "ikke oppgitt";

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
============================== */

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

function applyFilter(coords) {

    const checkboxes = document.querySelectorAll(
        'input[name="fasiliteter"]:checked'
    );

    const filters = Array.from(checkboxes).map(cb => cb.value);
    activeFilters = filters;

    maxTravelTime = Number(document.getElementById("input-reisetid").value);
    selectedTransport = document.querySelector('input[name="transport"]:checked')?.value;

    if (filters.length === 0 && !coords) {
        polygons.forEach(polygon => polygon.setMap(null));
        polygons = [];
        return;
    }

    drawAreas(area => {

        const score = calculateScore(area, filters, coords);

        if (score >= 85) return "#3DC485";
        if (score >= 65) return "#FFD26B";
        return "#F4665B";
    });
}

/* ==============================
   SCORE SYSTEM
============================== */

function calculateScore(area, filters, coords) {

    let score = 0;
    let maxScore = 0;

    if (minPrice && area.data.priceValue < minPrice) score -= 15;
    if (maxPrice && area.data.priceValue > maxPrice) score -= 15;

    filters.forEach(filter => {

        maxScore += 10;

        switch (filter) {
            case "kollektiv": score += area.data.transport;    break;
            case "skole":     score += area.data.school;       break;
            case "matbutikk": score += area.data.shop;         break;
            case "barnehage": score += area.data.kindergarten; break;
            case "apotek":    score += area.data.pharmacy;     break;
        }
    });

    const loc = coords || workLocationCoords;

    if (loc) {

        const distance = calculateDistance(
            loc.lat, loc.lng,
            area.center.lat, area.center.lng
        );

        let multiplier = 1.5;

        switch (selectedTransport) {
            case "gå":   multiplier = 12; break;
            case "buss": multiplier = 3;  break;
            case "bil":  multiplier = 1.5; break;
        }

        const estimatedMinutes = distance * multiplier;

        if (maxTravelTime && estimatedMinutes > maxTravelTime) score -= 25;

        const travelScore = Math.max(0, 20 - (estimatedMinutes / 5));
        score += travelScore;
        maxScore += 20;
    }

    if (maxScore === 0) return 0;

    return Math.round((score / maxScore) * 100);
}

function calculateDistance(lat1, lng1, lat2, lng2) {

    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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

    if (area.data.price < 5 && area.data.transport > 7)
        return "Et rimelig område med svært god kollektivdekning.";

    if (area.data.school > 8 && area.data.kindergarten > 7)
        return "Perfekt for familier med gode skoler og barnehager.";

    if (area.data.shop > 8 && area.data.transport > 8)
        return "Sentralt område med mange fasiliteter i nærheten.";

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

    localStorage.removeItem("lastResults");
    localStorage.removeItem("comparisonAreas");

    // Søk-knapp
    const searchButton = document.querySelector(".btn--primary");

    if (searchButton) {

        searchButton.addEventListener("click", async () => {

            const address = document.getElementById("work-location").value;

            maxTravelTime = Number(document.getElementById("input-reisetid").value);
            minPrice = Number(document.getElementById("min-price").value);
            maxPrice = Number(document.getElementById("max-price").value);

            if (!address) {
                alert("Vennligst skriv inn et arbeidssted.");
                return;
            }

            try {
                workLocationCoords = await geocodeWorkLocation(address);

                new google.maps.Marker({
                    position: workLocationCoords,
                    map: map,
                    title: "Arbeidssted"
                });

                map.panTo(workLocationCoords);
                map.setZoom(13);

                applyFilter(workLocationCoords);

            } catch (error) {
                console.log(error);
                alert("Fant ikke arbeidssted");
                return;
            }

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
    const resetButton = document.querySelector(".btn--secondary");

    if (resetButton) {

        resetButton.addEventListener("click", () => {

            document.querySelectorAll('input[name="fasiliteter"]').forEach(cb => {
                cb.checked = false;
            });

            drawAreas(() => "#cccccc");
        });
    }
});
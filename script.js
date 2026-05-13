let map;
let polygons = [];
let infoWindow;
let areas = [];

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
            applyFilter();
        });
    });

    // Søk-knapp
    const searchButton = document.querySelector(
        ".btn--primary"
    );

    if (searchButton) {

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
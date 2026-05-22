document.addEventListener("DOMContentLoaded", () => {

    const areas = JSON.parse(localStorage.getItem("comparisonAreas") || "[]");

    if (areas.length === 0) {
        document.getElementById("ai-winner").textContent = "Ingen områder valgt";
        document.getElementById("ai-reason").textContent = "Gå tilbake til kartet og legg til opp til 2 områder.";
        document.getElementById("compare-grid").innerHTML = `
            <p class="empty-state">
                <a href="map.html">← Gå tilbake og velg opp til 2 områder</a>
            </p>`;
        return;
    }

    /* ==============================
       AI ANBEFALING
    ============================== */

    const winner = areas.reduce((best, a) => a.score > best.score ? a : best, areas[0]);
    document.getElementById("ai-winner").textContent = winner.name;
    document.getElementById("ai-reason").textContent = winner.summary;

    /* ==============================
       SAMMENLIGN-GRID
    ============================== */

    document.getElementById("compare-grid").innerHTML = areas.map(area => {

        const rd = area.rawData || null;
        const commute = rd ? estimateCommute(rd) : null;

        const costBarPct   = rd ? Math.round((rd.price / 10) * 100) : 0;
        const timeBarPct   = commute ? Math.round((commute.totalMin / 40) * 100) : 0;

        const imgSrc = `images/${area.name.toLowerCase()}.png`;

        return `
        <article class="compare-column">

            <div class="column-image-wrapper">
                <img class="column-image" src="${imgSrc}" alt="Bilde av ${area.name}" onerror="this.remove()">
                <span class="column-image-title">${area.name}</span>
                <span class="match-badge">${area.score}% Match</span>
            </div>

            <div class="compare-column-body">

                ${rd ? `
                <section class="cost-commute-section">
                    <h3 class="section-label">Kostnad vs. Reisetid</h3>
                    <div class="cc-chart">
                        <div class="cc-bar-group">
                            <div class="cc-bar-track">
                                <div class="cc-bar-fill cc-bar-fill--cost" style="height:${costBarPct}%"></div>
                            </div>
                            <span class="cc-bar-name">Kostnad</span>
                            <span class="cc-bar-value">min. ${formatPrice(rd.priceValue)}</span>
                        </div>
                        <div class="cc-bar-group">
                            <div class="cc-bar-track">
                                <div class="cc-bar-fill cc-bar-fill--time" style="height:${timeBarPct}%"></div>
                            </div>
                            <span class="cc-bar-name">Reisetid</span>
                            <span class="cc-bar-value">${commute ? commute.totalMin + " min" : "—"}</span>
                        </div>
                    </div>
                </section>
                ` : ""}

                <section class="ai-explanation">
                    <h2>✦ AI forklaring</h2>
                    <p>${area.summary}</p>
                </section>

                ${commute ? `
                <section class="commute-timeline">
                    <h3>Pendlerkart</h3>
                    <div class="commute-total-time">
                        Rute til jobb — totalt ${commute.totalMin} min
                    </div>
                    <ul class="route-timeline">
                        <li>
                            <span class="route-icon">🏠</span> Hjem
                        </li>
                        <li data-type="bus">
                            <span class="route-icon">🚌</span>
                            Buss, hvert ${commute.busInterval}. minutt
                        </li>
                        <li data-type="transfer">
                            <span class="route-icon"> </span>
                            ${commute.busTime} min
                        </li>
                        <li>
                            <span class="route-icon">🏙️</span> Sentrum
                        </li>
                        <li data-type="transfer">
                            <span class="route-icon"> </span>
                            ${commute.walkToWork} min
                        </li>
                        <li>
                            <span class="route-icon">📍</span> Arbeidssted
                        </li>
                    </ul>
                </section>
                ` : ""}

                <section class="pros-cons">
                    <div class="pros">
                        <h3>Fordeler</h3>
                        <ul>
                            ${area.pros.map(p => `<li>${p}</li>`).join("")}
                        </ul>
                    </div>
                    <div class="cons">
                        <h3>Ulemper</h3>
                        <ul>
                            ${area.cons.map(c => `<li>${c}</li>`).join("")}
                        </ul>
                    </div>
                </section>

            </div>

        </article>`;

    }).join("");

    /* ==============================
       HIGHCHARTS RADAR-CHART
    ============================== */

    const hasRawData = areas.some(a => a.rawData);

    if (hasRawData) {
        renderRadarChart(areas);
    } else {
        renderScoreChart(areas);
    }
});

/* ==============================
   HJELPEFUNKSJONER
============================== */

function estimateCommute(rd) {

    const centrality = rd.commuteCityCenter ?? 5;
    const transport  = rd.transport ?? 5;

    // totalMin: 5 min (sentralt/god transport) → 35 min (periferi/dårlig transport)
    const totalMin = Math.max(8, Math.min(35, Math.round(35 - (centrality * 3))));

    const busInterval  = transport >= 8 ? 10 : transport >= 6 ? 15 : 20;
    const walkToStop   = Math.max(2, Math.round(10 - transport));
    const busTime      = Math.max(3, totalMin - walkToStop - 3);
    const walkToWork   = 3;

    return { totalMin, busInterval, walkToStop, busTime, walkToWork };
}

function formatPrice(value) {
    if (!value) return "—";
    if (value >= 1_000_000) {
        return (value / 1_000_000).toFixed(1).replace(".", ",") + "M NOK";
    }
    return value.toLocaleString("nb-NO") + " NOK";
}

/* ==============================
   CHARTS
============================== */

function renderRadarChart(areas) {

    Highcharts.chart("comparison-chart", {
        chart: {
            polar: true,
            type: "area",
            backgroundColor: "transparent",
            style: { fontFamily: "Inter, sans-serif" }
        },
        title: { text: null },
        pane: { size: "72%" },
        xAxis: {
            categories: ["Kollektiv", "Skole", "Butikk", "Barnehage", "Apotek", "Pris"],
            tickmarkPlacement: "on",
            lineWidth: 0,
            labels: { style: { fontSize: "13px" } }
        },
        yAxis: {
            gridLineInterpolation: "polygon",
            lineWidth: 0,
            min: 0,
            max: 10,
            labels: { enabled: false }
        },
        tooltip: {
            shared: true,
            pointFormat: "<span style='color:{series.color}'>{series.name}: <b>{point.y}/10</b><br/>"
        },
        legend: {
            align: "center",
            verticalAlign: "bottom",
            itemStyle: { fontFamily: "Inter, sans-serif", fontWeight: "500" }
        },
        series: areas.map(area => ({
            name: area.name,
            data: [
                area.rawData.transport,
                area.rawData.school,
                area.rawData.shop,
                area.rawData.kindergarten,
                area.rawData.pharmacy,
                10 - area.rawData.price
            ],
            pointPlacement: "on",
            fillOpacity: 0.2
        })),
        colors: ["#2F6B4F", "#C9A9E0"],
        credits: { enabled: false }
    });
}

function renderScoreChart(areas) {

    Highcharts.chart("comparison-chart", {
        chart: {
            type: "column",
            backgroundColor: "transparent",
            style: { fontFamily: "Inter, sans-serif" }
        },
        title: { text: null },
        xAxis: { categories: areas.map(a => a.name) },
        yAxis: {
            min: 0,
            max: 100,
            title: { text: "Match-score (%)" }
        },
        series: [{
            name: "Match-score",
            data: areas.map(a => a.score),
            color: "#2F6B4F",
            borderRadius: 6
        }],
        credits: { enabled: false }
    });
}

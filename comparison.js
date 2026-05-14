document.addEventListener("DOMContentLoaded", async () => {

    const selectedAreas = JSON.parse(localStorage.getItem("comparisonAreas") || "[]");
    const grid = document.getElementById("compare-grid");

    if (selectedAreas.length === 0) {
        grid.innerHTML = "<p class='compare-empty'>Ingen områder valgt. <a href='map.html'>Gå tilbake og velg områder.</a></p>";
        return;
    }

    // Fetch raw API data to power the radar charts
    let apiAreas = [];
    try {
        const response = await fetch("https://api.npoint.io/53863a384ef34a51ac0f");
        apiAreas = await response.json();
    } catch (e) {
        console.error("Kunne ikke hente områder:", e);
    }

    // Merge AI results with raw API data by name
    const mergedAreas = selectedAreas.map(aiArea => {
        const apiArea = apiAreas.find(a => a.name === aiArea.name);
        return { ...aiArea, data: apiArea ? apiArea.data : null };
    });

    // Render columns
    grid.innerHTML = mergedAreas.map(area => `
        <article class="compare-column">

            <header class="column-header">
                <h2>${area.name}</h2>
                <span class="card-match-badge">
                    <span class="card-match-percentage">${area.score}%</span>
                    <span>Match</span>
                </span>
            </header>

            <section class="ai-explanation">
                <h3>✦ AI forklaring</h3>
                <p>${area.summary}</p>
            </section>

            <section class="pros-cons">
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
            </section>

            ${area.data ? `<div id="chart-${area.name.replaceAll(" ", "-")}" class="area-chart"></div>` : ""}

        </article>
    `).join("");

    // Render individual radar charts
    mergedAreas.forEach(area => {
        if (area.data) {
            renderAreaChart("chart-" + area.name.replaceAll(" ", "-"), area);
        }
    });

    // Render combined overlay chart if 2 areas with data
    if (mergedAreas.length === 2 && mergedAreas[0].data && mergedAreas[1].data) {
        renderComparisonChart(mergedAreas[0], mergedAreas[1]);
    } else {
        document.querySelector(".comparison-chart-section").style.display = "none";
    }
});

const CHART_CATEGORIES = [
    "Butikker", "Natur", "Sikkerhet", "Transport",
    "Uteliv", "Skole", "Familie", "Parkering"
];

function getChartData(area) {
    return [
        area.data.shop,
        area.data.nature,
        area.data.safety,
        area.data.transport,
        area.data.nightlife,
        area.data.school,
        area.data.familyFriendly,
        area.data.parking
    ];
}

function renderAreaChart(chartId, area) {
    Highcharts.chart(chartId, {
        chart: { polar: true, type: "line" },
        title: { text: null },
        pane: { size: "80%" },
        xAxis: {
            categories: CHART_CATEGORIES,
            tickmarkPlacement: "on",
            lineWidth: 0
        },
        yAxis: {
            gridLineInterpolation: "polygon",
            min: 0,
            max: 10
        },
        tooltip: { pointFormat: "<b>{point.y}/10</b>" },
        legend: { enabled: false },
        series: [{
            name: area.name,
            data: getChartData(area),
            pointPlacement: "on",
            color: "#2F6B4F"
        }]
    });
}

function renderComparisonChart(areaOne, areaTwo) {
    Highcharts.chart("comparison-chart", {
        chart: { polar: true, type: "line" },
        title: { text: null },
        pane: { size: "80%" },
        xAxis: {
            categories: CHART_CATEGORIES,
            tickmarkPlacement: "on",
            lineWidth: 0
        },
        yAxis: {
            gridLineInterpolation: "polygon",
            min: 0,
            max: 10
        },
        tooltip: {
            shared: true,
            pointFormat: "<b>{series.name}: {point.y}/10</b><br>"
        },
        series: [
            {
                name: areaOne.name,
                data: getChartData(areaOne),
                pointPlacement: "on",
                color: "#2F6B4F"
            },
            {
                name: areaTwo.name,
                data: getChartData(areaTwo),
                pointPlacement: "on",
                color: "#C9A9E0"
            }
        ]
    });
}
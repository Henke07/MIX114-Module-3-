let areas = [];

async function init() {

    await loadAreas();

    populateDropdown();
}

//Laster områdedata
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

//Fyller dropdowns med områder fra API

function populateDropdown() {
    const areaOne = document.getElementById("area-one");
    const areaTwo = document.getElementById("area-two");

    areas.forEach(area => {

        const option1 = document.createElement("option");
        option1.value = area.name;
        option1.textContent = area.name;

        const option2 = document.createElement("option");
        option2.value = area.name;
        option2.textContent = area.name;

        areaOne.appendChild(option1);
        areaTwo.appendChild(option2);
    });
}

//Registrerer når sammenligningsknapp trykkes
document
    .getElementById("compare-btn")
    .addEventListener("click", handleCompare);

//Håndterer sammenligning
function handleCompare() {

    const areaOneValue =
        document.getElementById("area-one").value;

    const areaTwoValue =
        document.getElementById("area-two").value;

    //validerer at begge områder er valgt
    if (!areaOneValue || !areaTwoValue) {
        alert("Velg to områder");

        return;
    }

    //finner samsvarende områder fra API
    const areaOne = areas.find(
        area => area.name === areaOneValue
    );

    const areaTwo = areas.find(
        area => area.name === areaTwoValue
    );

    renderComparison(areaOne, areaTwo);
}

//Visualiserer sammenligningen av områdene

function renderComparison(areaOne, areaTwo) {

    const compareGrid =
        document.getElementById("compare-grid");

    const oldCards =
        compareGrid.querySelectorAll(
            ".compare-column:not(#area-template)"
        );

    oldCards.forEach(card => card.remove());

    const template =
        document.getElementById("area-template");

    [areaOne, areaTwo].forEach(area => {

        const clone =
            template.cloneNode(true);

        clone.style.display = "block";

        clone.removeAttribute("id");

        populateAreaCard(clone, area);

        compareGrid.appendChild(clone);
    });

    renderComparisonChart(areaOne, areaTwo);
}

//Fyller card med data

function populateAreaCard(card, area) {

    // navn
    card.querySelector("[data-name]").textContent =
        area.name;

    // pris
    card.querySelector("[data-cost]").textContent =
        area.data.price + "/10";

    // reisetid
    card.querySelector("[data-time]").textContent =
        area.data.commuteCityCenter + " min";

    // total reisetid
    card.querySelector("[data-total-time]").textContent =
        area.data.commuteCityCenter + " minutter";

    // pros
    const prosList =
        card.querySelector("[data-pros]");

    prosList.innerHTML = "";

    area.summary.pros.forEach(pro => {

        const li =
            document.createElement("li");

        li.textContent = pro;

        prosList.appendChild(li);
    });

    // cons
    const consList =
        card.querySelector("[data-cons]");

    consList.innerHTML = "";

    area.summary.cons.forEach(con => {

        const li =
            document.createElement("li");

        li.textContent = con;

        consList.appendChild(li);
    });

    // chart container
    const chartContainer =
        card.querySelector("[data-chart]");

    // unik id til chart
    const chartId =
        "chart-" +
        area.name.replaceAll(" ", "-");

    chartContainer.id = chartId;

    renderAreaChart(chartId, area);
}

function renderAreaChart(chartId, area) {

    Highcharts.chart(chartId, {

        chart: {
            polar: true,
            type: "line"
        },

        title: {
            text: area.name
        },

        pane: {
            size: "80%"
        },

        xAxis: {

            categories: [
                "Butikker",
                "Natur",
                "Sikkerhet",
                "Transport",
                "Uteliv",
                "Skole",
                "Familie",
                "Parkering"
            ],

            tickmarkPlacement: "on",

            lineWidth: 0
        },

        yAxis: {

            gridLineInterpolation: "polygon",

            min: 0,

            max: 10
        },

        tooltip: {

            pointFormat:
                "<b>{point.y}/10</b>"
        },

        series: [

            {
                name: area.name,

                data: [
                    area.data.shop,
                    area.data.nature,
                    area.data.safety,
                    area.data.transport,
                    area.data.nightlife,
                    area.data.school,
                    area.data.familyFriendly,
                    area.data.parking
                ],

                pointPlacement: "on"
            }
        ]
    });
}

function renderComparisonChart(areaOne, areaTwo) {

    Highcharts.chart("comparison-chart", {

        chart: {
            polar: true,
            type: "line"
        },

        title: {
            text: "Områdesammenligning"
        },

        pane: {
            size: "80%"
        },

        xAxis: {

            categories: [
                "Butikker",
                "Natur",
                "Sikkerhet",
                "Transport",
                "Uteliv",
                "Skole",
                "Familie",
                "Parkering"
            ],

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

            pointFormat:
                "<b>{series.name}: {point.y}/10</b><br>"
        },

        series: [

            {
                name: areaOne.name,

                data: [
                    areaOne.data.shop,
                    areaOne.data.nature,
                    areaOne.data.safety,
                    areaOne.data.transport,
                    areaOne.data.nightlife,
                    areaOne.data.school,
                    areaOne.data.familyFriendly,
                    areaOne.data.parking
                ],

                pointPlacement: "on"
            },

            {
                name: areaTwo.name,

                data: [
                    areaTwo.data.shop,
                    areaTwo.data.nature,
                    areaTwo.data.safety,
                    areaTwo.data.transport,
                    areaTwo.data.nightlife,
                    areaTwo.data.school,
                    areaTwo.data.familyFriendly,
                    areaTwo.data.parking
                ],

                pointPlacement: "on"
            }
        ]
    });
}

document.addEventListener(
    "DOMContentLoaded",
    init
);
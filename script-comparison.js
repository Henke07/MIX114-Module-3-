init()

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

    compareGrid.innerHTML = "";

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

    card.querySelector("[data-name]").textContent =
        area.name;

    card.querySelector("[data-cost]").textContent =
        area.data.price + "/10";

    card.querySelector("[data-time]").textContent =
        area.data.commuteCityCenter + " min";

    // pros
    const prosList =
        card.querySelector("[data-pros]");

    prosList.innerHTML = "";

    area.summary.pros.forEach(pro => {

        const li = document.createElement("li");

        li.textContent = pro;

        prosList.appendChild(li);
    });

    // cons
    const consList =
        card.querySelector("[data-cons]");

    consList.innerHTML = "";

    area.summary.cons.forEach(con => {

        const li = document.createElement("li");

        li.textContent = con;

        consList.appendChild(li);
    });
}

    //Hvis noen vil fortsette: mangler rendering av comparison chart, altså å generere highcharts og sette de inn i riktige områder i html

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
                "Familievennlig"
            ],

            tickmarkPlacement: "on",
            lineWidth: 0
        },

        yAxis: {
            min: 0,
            max: 10
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
                    areaOne.data.familyFriendly
                ]
            },

            {
                name: areaTwo.name,

                data: [
                    areaTwo.data.shop,
                    areaTwo.data.nature,
                    areaTwo.data.safety,
                    areaTwo.data.transport,
                    areaTwo.data.nightlife,
                    areaTwo.data.familyFriendly
                ]
            }
        ]
    });
}
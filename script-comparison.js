let areas = [];

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
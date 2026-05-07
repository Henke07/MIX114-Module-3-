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

//Display av data for sammenligning

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
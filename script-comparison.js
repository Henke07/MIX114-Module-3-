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

function displayComparisonData() {

}
document.addEventListener("DOMContentLoaded", () => {

    const areas = JSON.parse(localStorage.getItem("comparisonAreas") || "[]");
    const grid = document.getElementById("compare-grid");

    if (areas.length === 0) {
        grid.innerHTML = "<p>Ingen områder valgt. <a href='map.html'>Gå tilbake og velg områder.</a></p>";
        return;
    }

    grid.innerHTML = areas.map(area => `
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
                <div class="pros">
                    <div class="attributes-pros-title">Fordeler</div>
                    <ul class="attributes-pros-list">
                        ${area.pros.map(p => `<li>${p}</li>`).join("")}
                    </ul>
                </div>
                <div class="cons">
                    <div class="attributes-cons-title">Ulemper</div>
                    <ul class="attributes-cons-list">
                        ${area.cons.map(c => `<li>${c}</li>`).join("")}
                    </ul>
                </div>
            </section>

        </article>
    `).join("");
});
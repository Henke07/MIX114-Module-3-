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
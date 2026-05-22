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
                </div>
            </section>

        </article>
    `).join("");
});
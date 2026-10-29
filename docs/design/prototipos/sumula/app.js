(() => {
  "use strict";
  const { create, total, periodView } = window.ScoresheetData;
  let game = create("overtime"),
    selectedPeriod = "all",
    trigger = null;
  const dialog = document.querySelector("#foul-dialog");
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const show = (value) => (value === null ? "—" : String(value));
  const percentage = (made, taken) =>
    made === null || taken === null || taken === 0
      ? "—"
      : `${((made / taken) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  const ordered = (players) =>
    [...players].sort(
      (a, b) =>
        Number(a.jersey) - Number(b.jersey) ||
        a.jersey.length - b.jersey.length,
    );
  const missing = (value, name) =>
    value === null
      ? `<span role="img" aria-label="${escape(name)} não informado">—</span>`
      : value;
  const periodLabel = (value) =>
    value === "all"
      ? "Jogo todo"
      : Number(value) < 4
        ? `${Number(value) + 1}º quarto`
        : `${Number(value) - 3}ª prorrogação`;
  const periodShort = (value) =>
    value === "all"
      ? "Jogo todo"
      : Number(value) < 4
        ? `${Number(value) + 1}º Q`
        : `${Number(value) - 3}ª PR`;
  const view = (side) => periodView(game[side], selectedPeriod);
  const metric = (player, key, label) =>
    player.played
      ? missing(player[key], label)
      : '<span role="img" aria-label="Não entrou neste recorte">—</span>';
  function renderPeriodFilter() {
    document.querySelector("#period-filter").innerHTML = [
      "all",
      ...game.home.periods.map((_, i) => String(i)),
    ]
      .map(
        (value) =>
          `<button type="button" data-period="${value}" aria-pressed="${selectedPeriod === value}" aria-label="${periodShort(value)}: ${periodLabel(value)}">${periodShort(value)}</button>`,
      )
      .join("");
  }
  function renderPeriods() {
    const columns = game.home.periods
      .map(
        (_, i) =>
          `<th scope="col" class="${i > 3 ? "overtime " : ""}${selectedPeriod === String(i) ? "selected-period" : ""}"><button type="button" class="period-link" data-period="${i}" aria-pressed="${selectedPeriod === String(i)}" aria-label="${periodShort(String(i))}: ${periodLabel(String(i))}">${periodShort(String(i))}</button></th>`,
      )
      .join("");
    const row = (team) =>
      `<tr><th scope="row">${escape(team.name)}</th>${team.periods.map((points, i) => `<td class="${i > 3 ? "overtime " : ""}${selectedPeriod === String(i) ? "selected-period" : ""}"><span class="period-points">${missing(points, "Pontuação do quarto")}</span><span class="period-fouls" title="Faltas no quarto">${team.foulsByPeriod[i] === null ? '<span role="img" aria-label="Faltas do quarto não informadas">F—</span>' : `F${team.foulsByPeriod[i]}`}</span></td>`).join("")}<td class="period-total"><span class="period-points">${team.points}</span><span class="sr-only"> pontos no total</span></td></tr>`;
    document.querySelector("#periods").innerHTML =
      `<table class="period-table"><caption class="sr-only">Pontos e faltas de cada equipe por quarto. Selecione um cabeçalho para consultar o recorte das equipes.</caption><thead><tr><th scope="col">Equipe</th>${columns}<th scope="col" class="period-total"><button type="button" class="period-link" data-period="all" aria-pressed="${selectedPeriod === "all"}" aria-label="Total: jogo todo">Total</button></th></tr></thead><tbody>${row(game.home)}${row(game.away)}</tbody></table>`;
  }
  function renderTeam(side) {
    const team = view(side);
    const rows = ordered(team.players)
      .map((player) => {
        const status = !player.played
          ? "Não entrou neste recorte"
          : player.starter
            ? "Titular no jogo"
            : "Reserva que participou";
        const foulLabel =
          player.fouls === null
            ? `Detalhar faltas não informadas de ${player.name}`
            : `Detalhar ${player.fouls} ${player.fouls === 1 ? "falta" : "faltas"} de ${player.name}`;
        const hasDiscipline = ["five", "GD", "D"].includes(player.status);
        return `<tr data-jersey="${player.jersey}" data-played="${player.played}" class="${player.starter ? "starter" : ""} ${player.played ? "" : "did-not-play"}"><td class="jersey-cell">${player.jersey}</td><th scope="row" class="athlete-cell"><span class="athlete-line"><span class="athlete-text"><span class="athlete-name">${escape(player.name)}</span>${player.starter ? '<span class="starter-symbol" aria-hidden="true"> *</span>' : ""}</span>${player.captain ? '<span class="captain" role="img" aria-label="Capitão">CAP</span>' : ""}</span><span class="sr-only">. ${status}.</span></th><td class="points-cell">${metric(player, "points", "Pontos")}</td><td>${metric(player, "two", "Cestas de dois")}</td><td>${metric(player, "three", "Cestas de três")}</td><td>${metric(player, "free", "Lances livres")}</td><td class="foul-cell">${player.played ? `<button type="button" class="foul-button${hasDiscipline ? " discipline" : ""}" data-foul-side="${side}" data-foul-jersey="${player.jersey}" aria-label="${escape(foulLabel)}. ${periodLabel(selectedPeriod)}${hasDiscipline ? ". Há situação disciplinar registrada" : ""}" aria-haspopup="dialog">${show(player.fouls)}</button>` : '<span role="img" aria-label="Não entrou neste recorte">—</span>'}</td></tr>`;
      })
      .join("");
    const free = total(team, "free");
    return `<section class="team-section" data-team="${side}" aria-labelledby="team-${side}"><div class="team-heading"><h3 id="team-${side}">${escape(team.name)}</h3></div><p class="scroll-hint"><span>Deslize para ver todas as estatísticas</span><span aria-hidden="true">2P · 3P · LL · F</span></p><div class="table-scroll" role="region" aria-label="Estatísticas de ${escape(team.name)}: ${periodLabel(selectedPeriod)}" tabindex="0"><table class="roster-table"><caption class="sr-only">Atletas e estatísticas de ${escape(team.name)}: ${periodLabel(selectedPeriod)}. Titulares do jogo identificados por negrito e asterisco. CAP identifica o capitão.</caption><colgroup><col class="jersey-col"><col><col class="stat-col"><col class="stat-col"><col class="stat-col"><col class="stat-col"><col class="stat-col"></colgroup><thead><tr><th scope="col" class="jersey-cell">Nº</th><th scope="col" class="athlete-cell">Atleta</th><th scope="col" class="points-cell"><abbr title="Pontos totais">PTS</abbr></th><th scope="col"><abbr title="Cestas de dois pontos convertidas">2P</abbr></th><th scope="col"><abbr title="Cestas de três pontos convertidas">3P</abbr></th><th scope="col"><abbr title="Lances livres convertidos">LL</abbr></th><th scope="col"><abbr title="Faltas cometidas">F</abbr></th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th scope="row" colspan="2" class="total-label">Total da equipe</th><td class="points-cell">${team.points}</td><td>${missing(total(team, "two"), "Total de cestas de dois")}</td><td>${missing(total(team, "three"), "Total de cestas de três")}</td><td class="total-free" aria-label="Lances livres: ${show(free)} convertidos, ${show(team.freeTaken)} tentados; aproveitamento ${percentage(free, team.freeTaken)}"><span>${show(free)}/${show(team.freeTaken)}</span><small>${percentage(free, team.freeTaken)}</small></td><td>${missing(total(team, "fouls"), "Total de faltas dos atletas")}</td></tr></tfoot></table></div><dl class="staff"><div><dt>Técnico</dt><dd>${escape(team.coach)}</dd></div><div><dt>Auxiliar</dt><dd>${escape(team.assistant)}</dd></div></dl></section>`;
  }
  function renderTeams() {
    const scrolls = Object.fromEntries(
      [...document.querySelectorAll(".team-section")].map((section) => [
        section.dataset.team,
        section.querySelector(".table-scroll").scrollLeft,
      ]),
    );
    document.querySelector("#teams").innerHTML =
      renderTeam("home") + renderTeam("away");
    document
      .querySelectorAll(".team-section")
      .forEach(
        (section) =>
          (section.querySelector(".table-scroll").scrollLeft =
            scrolls[section.dataset.team] || 0),
      );
  }
  function render() {
    document.querySelector("#game-context-label").textContent =
      game.stage || `Jogo ${Number(game.number)}`;
    renderPeriodFilter();
    renderPeriods();
    renderTeams();
  }
  function selectPeriod(value, source) {
    if (
      value !== "all" &&
      (!/^\d+$/.test(value) || Number(value) >= game.home.periods.length)
    )
      return;
    selectedPeriod = value;
    const fromHeader = source.closest("#periods");
    renderPeriods();
    renderTeams();
    document
      .querySelectorAll("#period-filter [data-period]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.period === value),
        ),
      );
    if (fromHeader)
      document
        .querySelector(`#periods [data-period="${value}"]`)
        .focus({ preventScroll: true });
  }
  function renderFoulEvents(events) {
    if (!events?.length) return "";
    const names = {
      P: "Falta pessoal",
      T: "Falta técnica",
      U: "Falta antidesportiva",
      D: "Falta desqualificante",
    };
    const groups = [
      ["first", "1º tempo", (event) => event.period < 2],
      ["second", "2º tempo", (event) => event.period >= 2 && event.period < 4],
      ["overtime", "Prorrogação", (event) => event.period >= 4],
    ];
    const item = (event) => {
      const penalty = event.compensated
        ? "c"
        : event.freeThrows === null
          ? "?"
          : event.freeThrows > 0
            ? String(event.freeThrows)
            : "";
      const penaltyName = event.compensated
        ? "Penalidade compensada"
        : event.freeThrows === null
          ? "Penalidade não informada"
          : event.freeThrows === 0
            ? "Sem lances livres"
            : `${event.freeThrows} ${event.freeThrows === 1 ? "lance livre" : "lances livres"} de penalidade`;
      const title = `${names[event.kind]} · ${penaltyName} · ${periodLabel(String(event.period))}`;
      return `<li class="${event.period === 0 || event.period === 2 ? "quarter-red" : "quarter-blue"}" data-foul-period="${event.period}" data-free-throws="${event.freeThrows}" data-compensated="${event.compensated}"><abbr title="${title}"><span class="foul-kind">${event.kind}</span>${penalty ? `<sub>${penalty}</sub>` : ""}</abbr><span class="sr-only"> — ${title}.</span></li>`;
    };
    return `<div class="foul-halves">${groups
      .map(([key, label, includes]) => {
        const entries = events.filter(includes);
        return entries.length
          ? `<section class="foul-half" data-half="${key}" aria-labelledby="foul-half-${key}"><h3 id="foul-half-${key}">${label}</h3><ol class="foul-codes" aria-label="Faltas do ${label}">${entries.map(item).join("")}</ol></section>`
          : "";
      })
      .join("")}</div>`;
  }
  function openFouls(button) {
    const team = view(button.dataset.foulSide),
      player = team.players.find((p) => p.jersey === button.dataset.foulJersey);
    const state =
      {
        five: "Excluído por cinco faltas",
        GD: "Desqualificado (GD)",
        D: "Desqualificado (D)",
      }[player.status] || "";
    const events =
      player.fouls === null
        ? null
        : selectedPeriod === "all"
          ? player.quarters.flatMap((quarter) => quarter.foulEvents || [])
          : player.foulEvents;
    document.querySelector("#foul-content").innerHTML =
      `<p id="foul-player" class="dialog-athlete">${escape(player.name)}</p><p class="dialog-team">${escape(team.name)} · Camisa ${player.jersey}${player.captain ? " · Capitão" : ""}${selectedPeriod === "all" ? "" : ` · ${periodLabel(selectedPeriod)}`}</p><div class="foul-summary"><span>Faltas</span><strong>${show(player.fouls)}</strong></div>${player.fouls === null ? '<p class="missing-note">Faltas não informadas.</p>' : renderFoulEvents(events)}${state ? `<p class="discipline-status alert">${state}</p>` : ""}`;
    trigger = button;
    dialog.showModal();
  }
  document.querySelector("main").addEventListener("click", (event) => {
    const periodButton = event.target.closest("[data-period]");
    if (periodButton) {
      selectPeriod(periodButton.dataset.period, periodButton);
      return;
    }
    const foulButton =
      event.target.closest("[data-foul-side]") ||
      event.target.closest(".foul-cell")?.querySelector("[data-foul-side]");
    if (foulButton) openFouls(foulButton);
  });
  document
    .querySelector("#close-dialog")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  });
  dialog.addEventListener("close", () => {
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  });
  document.querySelectorAll("[data-scenario]").forEach((button) =>
    button.addEventListener("click", () => {
      game = create(button.dataset.scenario);
      selectedPeriod = "all";
      render();
      document
        .querySelectorAll("[data-scenario]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      document.querySelector("#scenario-feedback").textContent =
        `Cenário: ${button.textContent}.`;
    }),
  );
  render();
  window.scoresheetPrototype = Object.freeze({
    snapshot: () => structuredClone(game),
    view: (side) => structuredClone(view(side)),
    selectedPeriod: () => selectedPeriod,
    total,
    percentage,
  });
})();

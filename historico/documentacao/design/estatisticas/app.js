"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const teams = {
    pinheiros: { name: "Pinheiros", color: "#215fbe" },
    paulistano: { name: "Paulistano", color: "#c04243" },
    franca: { name: "Franca", color: "#bb7521" },
    saoJose: { name: "São José", color: "#338a90" },
    bauru: { name: "Bauru", color: "#367449" },
    mogi: { name: "Mogi das Cruzes", color: "#8057ac" },
  };
  // Each line belongs to one athlete/team. Only games with actual participation
  // are represented. Null fields model incomplete coverage, never a known zero.
  const seeds = [
    [
      "joao",
      "João Pedro Almeida",
      "pinheiros",
      11,
      10,
      75,
      25,
      20,
      24,
      1,
      0,
      756,
    ],
    ["rafael", "Rafael Costa", "paulistano", 7, 10, 80, 20, 25, 21, 0, 0, 810],
    [
      "gabriel",
      "Gabriel Nascimento",
      "franca",
      9,
      8,
      52,
      26,
      22,
      22,
      1,
      0,
      640,
    ],
    [
      "matheus",
      "Matheus Henrique de Oliveira Santos",
      "saoJose",
      14,
      9,
      60,
      16,
      30,
      27,
      2,
      0,
      708,
    ],
    ["lucas", "Lucas Ferreira", "bauru", 5, 6, 38, 24, 18, 16, 1, 0, 475],
    ["davi", "Davi Rodrigues", "mogi", 10, 10, 48, 18, 21, 28, 2, 1, 769],
    [
      "pedro",
      "Pedro Augusto Silva",
      "pinheiros",
      8,
      9,
      51,
      12,
      24,
      18,
      0,
      0,
      688,
    ],
    ["arthur", "Arthur Ribeiro", "paulistano", 4, 7, 39, 20, 19, 23, 1, 0, 566],
    ["enzo", "Enzo Martins", "franca", 6, 8, 45, 10, 23, 20, 1, 0, 640],
    ["bernardo", "Bernardo Souza", "bauru", 12, 9, 41, 13, 17, 29, 2, 0, 710],
    ["thiago", "Thiago Lima", "saoJose", 15, 5, 30, 10, 15, 13, 0, 0, 396],
    ["felipe", "Felipe Araújo", "mogi", 13, 8, 31, 14, 12, 18, 0, 0, null],
    ["lucas", "Lucas Ferreira", "pinheiros", 5, 3, 16, 12, 8, 8, 0, 0, 231],
    [
      "henrique",
      "Henrique Carvalho",
      "paulistano",
      18,
      4,
      22,
      0,
      9,
      null,
      null,
      0,
      324,
    ],
    ["miguel", "Miguel Moreira", "franca", 20, 2, 6, 3, 3, 4, 0, 0, 157],
    ["vicente", "Vicente Teixeira", "bauru", 3, 1, 0, 0, 0, 0, 0, 0, 76],
  ];
  function distribute(total, n, offset = 0) {
    if (total === null) return Array(n).fill(null);
    const parts = Array(n).fill(0);
    for (let i = 0; i < total; i++) parts[(i + offset) % n]++;
    return parts;
  }
  const athletes = seeds.map(
    ([
      id,
      name,
      team,
      jersey,
      j,
      two,
      three,
      ft,
      fouls,
      five,
      gd,
      teamPoints,
    ]) => {
      const twos = distribute(two, j),
        threes = distribute(three, j, 2),
        fts = distribute(ft, j, 4);
      const teamScores = distribute(teamPoints, j);
      // Place exactly five fouls in the designated games, then distribute the
      // remaining fouls among the others without creating extra five-foul games.
      const foulScores =
        fouls === null ? Array(j).fill(null) : Array(j).fill(0);
      if (fouls !== null) {
        for (let i = 0; i < five; i++) foulScores[i] = 5;
        let left = fouls - five * 5;
        for (let i = five; left > 0; i = i + 1 < j ? i + 1 : five) {
          if (foulScores[i] < 4) {
            foulScores[i]++;
            left--;
          }
        }
      }
      const games = Array.from({ length: j }, (_, i) => ({
        two: twos[i],
        three: threes[i],
        ft: fts[i],
        fouls: foulScores[i],
        five: five === null ? null : Number(i < five),
        gd: Number(i < gd),
        teamPoints: teamScores[i],
        // Fixtures deliberately include both a most-used shirt and a tie.
        jersey:
          id === "joao"
            ? i < 7
              ? 11
              : 12
            : id === "lucas" && team === "bauru"
              ? i < 3
                ? 5
                : 12
              : jersey,
      }));
      return { id: `${id}-${team}`, personId: id, name, team, jersey, games };
    },
  );
  const columns = [
    {
      key: "j",
      label: "J",
      title: "Jogos disputados",
      text: "Partidas em que o atleta efetivamente entrou em quadra. Jogos sem participação não entram em J nem nos denominadores de PPJ e PP%.",
    },
    {
      key: "pts",
      label: "PTS",
      title: "Pontos totais",
      text: "Soma dos pontos nos jogos disputados. PTS = 2 × 2P + 3 × 3P + LL. Se a cobertura de pontuação estiver incompleta, o resultado é —.",
    },
    {
      key: "ppj",
      label: "PPJ",
      title: "Pontos por jogo",
      text: "Pontos totais divididos pelos jogos em que o atleta participou. Exemplo: 245 ÷ 10 = 24,5 pontos por jogo.",
    },
    {
      key: "pp",
      label: "PP%",
      title: "Participação na pontuação",
      text: "Pontos totais do atleta ÷ soma dos pontos da equipe nos mesmos jogos × 100. Não é a média dos percentuais de cada jogo. Exemplo: 245 ÷ 756 × 100 = 32,4%.",
    },
    {
      key: "two",
      label: "2P",
      average: "2P/J",
      title: "Cestas de dois pontos",
      text: "Cestas de dois pontos convertidas, não tentativas. Em “Por jogo”, o total é dividido pelos jogos disputados.",
    },
    {
      key: "three",
      label: "3P",
      average: "3P/J",
      title: "Cestas de três pontos",
      text: "Cestas de três pontos convertidas, não tentativas. Em “Por jogo”, o total é dividido pelos jogos disputados.",
    },
    {
      key: "ft",
      label: "LL",
      average: "LL/J",
      title: "Lances livres",
      text: "Lances livres convertidos. Em “Por jogo”, o total é dividido pelos jogos disputados.",
    },
    {
      key: "fouls",
      label: "F",
      average: "F/J",
      title: "Faltas cometidas",
      text: "Total de faltas cometidas. Em “Por jogo”, o total é dividido pelos jogos disputados. Cobertura incompleta aparece como —.",
    },
    {
      key: "five",
      label: "5F",
      title: "Jogos com cinco faltas",
      text: "Quantidade de partidas em que o atleta atingiu cinco faltas, com no máximo uma unidade por partida. Não é o total de faltas dividido por cinco. Não muda no modo “Por jogo”.",
    },
    {
      key: "gd",
      label: "GD",
      title: "Jogos com desqualificação",
      text: "Quantidade de partidas em que o atleta foi desqualificado, com no máximo uma unidade por partida. Não muda no modo “Por jogo”.",
    },
  ];
  const state = {
    mode: "totals",
    sort: "pts",
    direction: "desc",
    loading: false,
  };
  const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
  const normalize = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const sum = (games, key) =>
    games.some((g) => g[key] === null)
      ? null
      : games.reduce((n, g) => n + g[key], 0);
  function metrics(a) {
    const j = a.games.length,
      two = sum(a.games, "two"),
      three = sum(a.games, "three"),
      ft = sum(a.games, "ft");
    const pts = [two, three, ft].includes(null)
      ? null
      : two * 2 + three * 3 + ft;
    const denominator = sum(a.games, "teamPoints");
    return {
      j,
      pts,
      ppj: pts === null ? null : pts / j,
      pp:
        pts === null || denominator === null || denominator === 0
          ? null
          : (100 * pts) / denominator,
      two,
      three,
      ft,
      fouls: sum(a.games, "fouls"),
      five: sum(a.games, "five"),
      gd: sum(a.games, "gd"),
    };
  }
  const label = (c) =>
    state.mode === "averages" && c.average ? c.average : c.label;
  const value = (row, key) =>
    state.mode === "averages" && columns.find((c) => c.key === key)?.average
      ? row.values[key] === null
        ? null
        : row.values[key] / row.values.j
      : row.values[key];
  // Preserve precision for sorting; round only when displaying the metric.
  const rankingValue = (row, key) => value(row, key);
  function rows() {
    const term = normalize($("search").value),
      team = $("team").value,
      min = Number($("minimum").value) || 0;
    const result = athletes
      .map((a) => ({ ...a, values: metrics(a) }))
      .filter(
        (a) =>
          a.values.j > 0 &&
          normalize(a.name).includes(term) &&
          (!team || a.team === team) &&
          a.values.j >= min,
      );
    result.sort((a, b) => {
      const av = rankingValue(a, state.sort),
        bv = rankingValue(b, state.sort);
      if (av === null && bv !== null) return 1;
      if (bv === null && av !== null) return -1;
      return (
        (av === bv ? 0 : (av - bv) * (state.direction === "desc" ? -1 : 1)) ||
        collator.compare(a.name, b.name) ||
        collator.compare(teams[a.team].name, teams[b.team].name)
      );
    });
    let previous,
      rank = 0;
    result.forEach((r, i) => {
      const v = rankingValue(r, state.sort);
      if (i === 0 || v !== previous) rank = i + 1;
      r.rank = v === null ? null : rank;
      previous = v;
    });
    return result;
  }
  function preferredJersey(games) {
    const counts = new Map();
    games.forEach((g, index) => {
      if (g.jersey === null || g.jersey === undefined) return;
      const key = String(g.jersey);
      counts.set(key, {
        number: key,
        count: (counts.get(key)?.count || 0) + 1,
        last: index,
      });
    });
    return (
      [...counts.values()].sort(
        (a, b) => b.count - a.count || b.last - a.last,
      )[0]?.number ?? null
    );
  }
  let tooltipAnchor = null;
  function hideTooltip() {
    $("metric-tooltip").hidden = true;
    tooltipAnchor?.removeAttribute("aria-describedby");
    tooltipAnchor = null;
  }
  function showTooltip(anchor) {
    hideTooltip();
    tooltipAnchor = anchor;
    const tip = $("metric-tooltip");
    const c = columns.find((c) => c.key === anchor.dataset.sort);
    tip.textContent = c
      ? `${label(c)} · ${c.title}. ${c.text}`
      : anchor.dataset.help;
    tip.hidden = false;
    anchor.setAttribute("aria-describedby", "metric-tooltip");
    const r = anchor.getBoundingClientRect(),
      box = tip.getBoundingClientRect();
    tip.style.left = `${Math.max(12, Math.min(innerWidth - box.width - 12, r.left + r.width / 2 - box.width / 2))}px`;
    tip.style.top = `${r.top > box.height + 18 ? r.top - box.height - 8 : r.bottom + 8}px`;
  }
  function renderHead() {
    hideTooltip();
    $("table-head").innerHTML =
      '<tr><th scope="col"><span tabindex="0" data-help="Posição na métrica selecionada e no conjunto filtrado. Empates compartilham posição: 1, 1, 3. Nomes em ordem alfabética entre empatados.">Pos.</span></th><th scope="col">Atleta</th><th scope="col">Equipe</th>' +
      columns
        .map(
          (c) =>
            `<th scope="col" data-column="${c.key}" ${state.sort === c.key ? `aria-sort="${state.direction === "desc" ? "descending" : "ascending"}" class="active-column"` : ""}><button class="sort" data-sort="${c.key}" aria-label="Ordenar por ${label(c)}: ${c.title}" aria-pressed="${state.sort === c.key}">${label(c)}${state.sort === c.key ? `<span class="sort-arrow" aria-hidden="true">${state.direction === "desc" ? "↓" : "↑"}</span>` : ""}</button></th>`,
        )
        .join("") +
      "</tr>";
    $("totals").setAttribute("aria-pressed", state.mode === "totals");
    $("averages").setAttribute("aria-pressed", state.mode === "averages");
    const c = columns.find((c) => c.key === state.sort);
    $("ranking-description").textContent =
      `Ordenado por ${label(c) === "PTS" ? "pontos totais" : label(c)}, ${state.direction === "desc" ? "do maior para o menor" : "do menor para o maior"}`;
  }
  function render() {
    renderHead();
    $("table-region").setAttribute("aria-busy", state.loading);
    if (state.loading) {
      $("result-count").textContent = "Carregando atletas…";
      $("table-body").innerHTML = Array.from(
        { length: 6 },
        () =>
          '<tr class="loading-row" aria-hidden="true">' +
          Array.from(
            { length: 13 },
            (_, i) =>
              `<td><span class="skeleton ${i === 1 ? "skeleton-name" : ""}"></span></td>`,
          ).join("") +
          "</tr>",
      ).join("");
      return;
    }
    const filtered = rows();
    const unique = new Set(filtered.map((a) => a.personId)).size;
    $("result-count").textContent =
      `${unique} ${unique === 1 ? "atleta" : "atletas"} · ${filtered.length} ${filtered.length === 1 ? "registro por equipe" : "registros por equipe"}`;
    if (!filtered.length) {
      $("table-body").innerHTML =
        '<tr><td colspan="13" class="empty-cell"><div><strong>Nenhum atleta encontrado</strong><p>Tente outro nome ou ajuste os filtros para ampliar a busca.</p><button type="button" id="empty-clear">Limpar filtros</button></div></td></tr>';
      return;
    }
    $("table-body").innerHTML = filtered
      .map((a) => {
        const shirt = preferredJersey(a.games);
        return (
          `<tr data-athlete="${a.id}"><td class="rank">${a.rank ?? "—"}</td><th scope="row"><div class="player"><span class="player-jersey" aria-label="Camisa ${shirt ?? "não informada"}">${shirt === null ? "—" : `#${shirt}`}</span><span class="player-name">${escape(a.name)}</span></div></th><td class="team-name">${teams[a.team].name}</td>` +
          columns
            .map((c) => {
              const v = value(a, c.key),
                useDecimal =
                  ["ppj", "pp"].includes(c.key) ||
                  (state.mode === "averages" && c.average);
              const display =
                v === null
                  ? `<span class="missing" tabindex="0" data-help="${c.key === "pp" ? "A pontuação da equipe não está disponível em todos os jogos deste atleta. PP% não é calculado com cobertura parcial." : "Informação ausente ou incompleta. Total e média não são calculados com cobertura parcial."}" aria-label="${label(c)}: informação ausente ou incompleta">—</span>`
                  : (useDecimal ? decimal : integer).format(v) +
                    (c.key === "pp" ? "%" : "");
              return `<td data-value="${c.key}" class="${state.sort === c.key ? "active-column" : ""}">${display}</td>`;
            })
            .join("") +
          "</tr>"
        );
      })
      .join("");
  }
  Object.entries(teams)
    .sort((a, b) => collator.compare(a[1].name, b[1].name))
    .forEach(([id, t]) => $("team").add(new Option(t.name, id)));
  $("filters").addEventListener("submit", (e) => e.preventDefault());
  ["search", "team", "minimum"].forEach((id) =>
    $(id).addEventListener("input", () => {
      state.loading = false;
      render();
    }),
  );
  function clear() {
    $("search").value = "";
    $("team").value = "";
    $("minimum").value = "";
    state.loading = false;
    render();
  }
  $("clear").addEventListener("click", clear);
  document.addEventListener("click", (e) => {
    const sort = e.target.closest("[data-sort]");
    if (sort) {
      const key = sort.dataset.sort;
      state.direction =
        state.sort === key && state.direction === "desc" ? "asc" : "desc";
      state.sort = key;
      render();
      document
        .querySelector(`[data-sort="${key}"]`)
        .focus({ preventScroll: true });
    }
    const help = e.target.closest("[data-help]");
    if (help) showTooltip(help);
    if (!sort && !help && !e.target.closest("#metric-tooltip")) hideTooltip();
    if (e.target.closest("#empty-clear")) {
      clear();
      $("search").focus();
    }
  });
  function mode(m) {
    state.mode = m;
    render();
  }
  $("totals").addEventListener("click", () => mode("totals"));
  $("averages").addEventListener("click", () => mode("averages"));
  let tooltipTimer;
  document.addEventListener("pointermove", (e) => {
    if ($("metric-tooltip").hidden) return;
    const r = $("metric-tooltip").getBoundingClientRect();
    const a = tooltipAnchor?.getBoundingClientRect();
    const inside = (box) =>
      box &&
      e.clientX >= box.left &&
      e.clientX <= box.right &&
      e.clientY >= box.top &&
      e.clientY <= box.bottom;
    clearTimeout(tooltipTimer);
    if (!inside(r) && !inside(a) && tooltipAnchor !== document.activeElement)
      tooltipTimer = setTimeout(hideTooltip, 160);
  });
  document.addEventListener("pointerover", (e) => {
    const anchor = e.target.closest("[data-sort], [data-help]");
    if (anchor && anchor !== tooltipAnchor) {
      clearTimeout(tooltipTimer);
      showTooltip(anchor);
    }
    if (e.target.closest("#metric-tooltip")) clearTimeout(tooltipTimer);
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest("[data-sort], [data-help], #metric-tooltip"))
      tooltipTimer = setTimeout(() => {
        if (tooltipAnchor !== document.activeElement) hideTooltip();
      }, 160);
  });
  document.addEventListener("focusin", (e) => {
    const anchor = e.target.closest("[data-sort], [data-help]");
    if (anchor) showTooltip(anchor);
    else hideTooltip();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideTooltip();
  });
  $("table-region").addEventListener("scroll", hideTooltip, { passive: true });
  window.addEventListener("scroll", hideTooltip, { passive: true });
  window.addEventListener("resize", hideTooltip);
  let loadingTimer;
  function simulateLoading() {
    clearTimeout(loadingTimer);
    state.loading = true;
    render();
    loadingTimer = setTimeout(() => {
      state.loading = false;
      render();
    }, 1200);
  }
  function shortcut(key, m = "totals") {
    clear();
    state.mode = m;
    state.sort = key;
    state.direction = "desc";
    render();
  }
  $("demo-points").addEventListener("click", () => shortcut("pts"));
  $("demo-ppj").addEventListener("click", () => shortcut("ppj"));
  $("demo-threes").addEventListener("click", () =>
    shortcut("three", "averages"),
  );
  $("demo-loading").addEventListener("click", simulateLoading);
  $("demo-empty").addEventListener("click", () => {
    clear();
    $("search").value = "Atleta inexistente";
    render();
  });
  $("demo-reset").addEventListener("click", () => shortcut("pts"));
  // Read-only audit surface for checking fixture arithmetic in the prototype.
  window.prototypeStatistics = Object.freeze({
    rows: () => rows().map((a) => ({ id: a.id, rank: a.rank, ...a.values })),
    fixtures: () => structuredClone(athletes),
    preferredJersey: (games) => preferredJersey(games),
  });
  render();
})();

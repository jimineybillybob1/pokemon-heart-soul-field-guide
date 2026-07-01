(() => {
  const data = window.HEART_SOUL_DATA;
  if (!data) {
    document.body.innerHTML = "<main class=\"empty\">Guide data did not load.</main>";
    return;
  }

  const saveKey = "heart-soul-field-guide-save-v1";
  const species = [...data.species].sort((a, b) => Number(a.dex || 0) - Number(b.dex || 0));
  const speciesByName = new Map(species.map((entry) => [entry.name, entry]));
  const moveByName = new Map(data.moves.map((move) => [move.name, move]));
  const typeNames = [
    "Normal",
    "Fire",
    "Water",
    "Electric",
    "Grass",
    "Ice",
    "Fighting",
    "Poison",
    "Ground",
    "Flying",
    "Psychic",
    "Bug",
    "Rock",
    "Ghost",
    "Dragon",
    "Dark",
    "Steel",
    "Fairy",
  ];
  const typeColors = {
    Normal: "#7b7f86",
    Fire: "#d74f32",
    Water: "#2878c8",
    Electric: "#c99a17",
    Grass: "#2b9b57",
    Ice: "#4ea8b8",
    Fighting: "#b74c3a",
    Poison: "#8a5bb4",
    Ground: "#a87337",
    Flying: "#6387d4",
    Psychic: "#d84d7f",
    Bug: "#7e9d25",
    Rock: "#887242",
    Ghost: "#5b5a9d",
    Dragon: "#5b62c8",
    Dark: "#55515a",
    Steel: "#6f8793",
    Fairy: "#d45fa8",
    Mystery: "#6a7a8a",
  };
  const gen3SpecialTypes = new Set(["Fire", "Water", "Grass", "Electric", "Ice", "Psychic", "Dragon", "Dark"]);

  const state = loadState();
  const filters = {
    dexSearch: "",
    dexType: "",
    dexAvailability: "",
    dexCaughtOnly: false,
    locationSearch: "",
    itemSearch: "",
    itemType: "",
    moveSearch: "",
    moveType: "",
    moveCategory: "",
    trainerSearch: "",
    trainerCategory: "",
  };

  const els = {
    tabs: [...document.querySelectorAll("[data-view]")],
    views: [...document.querySelectorAll(".view")],
    stats: {
      species: document.querySelector("#stat-species"),
      locations: document.querySelector("#stat-locations"),
      items: document.querySelector("#stat-items"),
      trainers: document.querySelector("#stat-trainers"),
      caught: document.querySelector("#stat-caught"),
    },
    dexControls: document.querySelector("#dex-controls"),
    dexGrid: document.querySelector("#dex-grid"),
    dexCount: document.querySelector("#dex-count"),
    locationControls: document.querySelector("#location-controls"),
    locationList: document.querySelector("#location-list"),
    locationCount: document.querySelector("#location-count"),
    itemControls: document.querySelector("#item-controls"),
    itemTable: document.querySelector("#item-table"),
    itemCount: document.querySelector("#item-count"),
    moveControls: document.querySelector("#move-controls"),
    moveTable: document.querySelector("#move-table"),
    moveCount: document.querySelector("#move-count"),
    trainerControls: document.querySelector("#trainer-controls"),
    trainerList: document.querySelector("#trainer-list"),
    trainerCount: document.querySelector("#trainer-count"),
    rulesPanel: document.querySelector("#rules-panel"),
    teamGrid: document.querySelector("#team-grid"),
    plannerGrid: document.querySelector("#planner-grid"),
    battleTargets: document.querySelector("#battle-targets"),
    battleResults: document.querySelector("#battle-results"),
    moreGrid: document.querySelector("#more-grid"),
    savePanel: document.querySelector("#save-panel"),
    themeToggle: document.querySelector("#theme-toggle"),
  };

  const typeChart = createTypeChart();

  init();

  function init() {
    document.documentElement.dataset.theme = state.theme;
    updateCounts();
    renderControls();
    renderDex();
    renderLocations();
    renderItems();
    renderMoves();
    renderTrainers();
    renderRules();
    renderTeam();
    renderPlanner();
    renderBattlePlanner();
    renderMore();
    renderSave();
    bindEvents();
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const viewButton = event.target.closest("[data-view], [data-view-link]");
      if (viewButton) {
        event.preventDefault();
        showView(viewButton.dataset.view || viewButton.dataset.viewLink);
        return;
      }

      const caughtButton = event.target.closest("[data-caught]");
      if (caughtButton) {
        const name = caughtButton.dataset.caught;
        state.caught[name] = !state.caught[name];
        persist();
        updateCounts();
        renderDex();
        renderSave();
        return;
      }

      const teamButton = event.target.closest("[data-add-team]");
      if (teamButton) {
        addToTeam(teamButton.dataset.addTeam);
        return;
      }

      const plannerButton = event.target.closest("[data-add-planner]");
      if (plannerButton) {
        addToPlanner(plannerButton.dataset.addPlanner);
        return;
      }

      const clearTeam = event.target.closest("[data-clear-team]");
      if (clearTeam) {
        state.team[Number(clearTeam.dataset.clearTeam)] = blankTeamSlot();
        persistAndRenderTeam();
        return;
      }

      const clearPlanner = event.target.closest("[data-clear-planner]");
      if (clearPlanner) {
        state.planner[Number(clearPlanner.dataset.clearPlanner)] = blankPlannerSlot();
        persistAndRenderPlanner();
        return;
      }

      if (event.target.closest("#export-save")) {
        exportSave();
        return;
      }

      if (event.target.closest("#reset-save")) {
        if (confirm("Reset caught Pokemon, team, planner, battle targets, and rules?")) {
          const fresh = defaultState();
          Object.assign(state, fresh);
          persist();
          rerenderStateful();
        }
      }
    });

    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleChange);

    els.themeToggle.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = state.theme;
      persist();
    });
  }

  function handleInput(event) {
    const target = event.target;
    if (target.matches("#dex-search")) {
      filters.dexSearch = target.value;
      renderDex();
    } else if (target.matches("#location-search")) {
      filters.locationSearch = target.value;
      renderLocations();
    } else if (target.matches("#item-search")) {
      filters.itemSearch = target.value;
      renderItems();
    } else if (target.matches("#move-search")) {
      filters.moveSearch = target.value;
      renderMoves();
    } else if (target.matches("#trainer-search")) {
      filters.trainerSearch = target.value;
      renderTrainers();
    } else if (target.matches("[data-planner-note]")) {
      const index = Number(target.dataset.plannerNote);
      state.planner[index].note = target.value;
      persist();
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (target.matches("#dex-type")) {
      filters.dexType = target.value;
      renderDex();
    } else if (target.matches("#dex-availability")) {
      filters.dexAvailability = target.value;
      renderDex();
    } else if (target.matches("#dex-caught-only")) {
      filters.dexCaughtOnly = target.checked;
      renderDex();
    } else if (target.matches("#item-type")) {
      filters.itemType = target.value;
      renderItems();
    } else if (target.matches("#move-type")) {
      filters.moveType = target.value;
      renderMoves();
    } else if (target.matches("#move-category")) {
      filters.moveCategory = target.value;
      renderMoves();
    } else if (target.matches("#trainer-category")) {
      filters.trainerCategory = target.value;
      renderTrainers();
    } else if (target.matches("[data-rule]")) {
      state.rules[target.dataset.rule] = target.checked;
      persist();
      renderRules();
      renderTeam();
      renderBattlePlanner();
    } else if (target.matches("[data-team-species]")) {
      const index = Number(target.dataset.teamSpecies);
      const entry = speciesByName.get(target.value);
      state.team[index] = {
        species: entry ? entry.name : "",
        ability: entry?.abilities?.[0] || "",
        moves: ["", "", "", ""],
      };
      persistAndRenderTeam();
    } else if (target.matches("[data-team-ability]")) {
      state.team[Number(target.dataset.teamAbility)].ability = target.value;
      persist();
      renderBattlePlanner();
    } else if (target.matches("[data-team-move]")) {
      const index = Number(target.dataset.teamSlot);
      const moveIndex = Number(target.dataset.teamMove);
      state.team[index].moves[moveIndex] = target.value;
      persist();
      renderBattlePlanner();
    } else if (target.matches("[data-planner-species]")) {
      const index = Number(target.dataset.plannerSpecies);
      state.planner[index].species = target.value;
      persistAndRenderPlanner();
    } else if (target.matches("[data-battle-target]")) {
      state.battleTargets[Number(target.dataset.battleTarget)] = target.value;
      persist();
      renderBattlePlanner();
    } else if (target.matches("#import-save-file")) {
      importSave(target.files?.[0]);
      target.value = "";
    }
  }

  function renderControls() {
    const typeOptions = ["", ...typeNames].map((type) => option(type, type || "Any type")).join("");
    const itemTypes = unique(data.items.map((item) => item.type)).sort();
    const trainerCategories = unique(data.trainers.map((trainer) => trainer.category)).sort();
    els.dexControls.innerHTML = `
      <label class="field grow"><span>Search</span><input id="dex-search" type="search" placeholder="Pokemon, ability, item, location" value="${attr(filters.dexSearch)}" /></label>
      <label class="field"><span>Type</span><select id="dex-type">${typeOptions}</select></label>
      <label class="field"><span>Availability</span><select id="dex-availability">
        ${option("", "Any availability")}
        ${option("wild", "Wild")}
        ${option("static", "Static, gift, trade")}
        ${option("none", "No location listed")}
      </select></label>
      <label class="rule-toggle"><input id="dex-caught-only" type="checkbox" ${filters.dexCaughtOnly ? "checked" : ""} /> Caught only</label>
    `;
    els.locationControls.innerHTML = `
      <label class="field grow"><span>Search</span><input id="location-search" type="search" placeholder="Location, Pokemon, method, time" value="${attr(filters.locationSearch)}" /></label>
    `;
    els.itemControls.innerHTML = `
      <label class="field grow"><span>Search</span><input id="item-search" type="search" placeholder="Item, move, location, held species" value="${attr(filters.itemSearch)}" /></label>
      <label class="field"><span>Type</span><select id="item-type">${option("", "Any type")}${itemTypes.map((type) => option(type, type)).join("")}</select></label>
    `;
    els.moveControls.innerHTML = `
      <label class="field grow"><span>Search</span><input id="move-search" type="search" placeholder="Move, effect, flag" value="${attr(filters.moveSearch)}" /></label>
      <label class="field"><span>Type</span><select id="move-type">${typeOptions}</select></label>
      <label class="field"><span>Category</span><select id="move-category">
        ${option("", "Any category")}
        ${option("Physical", "Physical")}
        ${option("Special", "Special")}
        ${option("Status", "Status")}
      </select></label>
    `;
    els.trainerControls.innerHTML = `
      <label class="field grow"><span>Search</span><input id="trainer-search" type="search" placeholder="Trainer, category, Pokemon, move" value="${attr(filters.trainerSearch)}" /></label>
      <label class="field"><span>Category</span><select id="trainer-category">${option("", "Any category")}${trainerCategories.map((category) => option(category, category)).join("")}</select></label>
    `;
  }

  function renderDex() {
    const query = normalize(filters.dexSearch);
    const filtered = species.filter((entry) => {
      const haystack = normalize([
        entry.name,
        entry.types.join(" "),
        entry.abilities.join(" "),
        entry.wildLocations.join(" "),
        entry.staticLocations.join(" "),
        entry.heldItems.common,
        entry.heldItems.rare,
      ].join(" "));
      const hasAvailability =
        filters.dexAvailability === "" ||
        (filters.dexAvailability === "wild" && entry.wildLocations.length) ||
        (filters.dexAvailability === "static" && entry.staticLocations.length) ||
        (filters.dexAvailability === "none" && !entry.wildLocations.length && !entry.staticLocations.length);
      return (
        (!query || haystack.includes(query)) &&
        (!filters.dexType || entry.types.includes(filters.dexType)) &&
        hasAvailability &&
        (!filters.dexCaughtOnly || state.caught[entry.name])
      );
    });
    els.dexCount.textContent = `Showing ${filtered.length} of ${species.length}`;
    els.dexGrid.innerHTML = filtered.map(renderDexCard).join("") || empty("No Pokemon match those filters.");
  }

  function renderDexCard(entry) {
    const caught = Boolean(state.caught[entry.name]);
    const levelMoves = entry.learnsets.level.slice(0, 16).map((move) => `Lv ${value(move.level)} ${text(move.move)}`).join(", ");
    const tmMoves = entry.learnsets.tmhm.slice(0, 22).map(text).join(", ");
    const tutorMoves = entry.learnsets.tutor.slice(0, 18).map(text).join(", ");
    const eggMoves = entry.learnsets.egg.slice(0, 18).map(text).join(", ");
    const availability = renderAvailability(entry);
    const evoOut = entry.evolutions.map((evo) => `${text(evo.to)} via ${text(joinParts([evo.method, evo.requirement, evo.conditions]))}`);
    const evoIn = entry.evolvesFrom.map((evo) => `${text(evo.from)} via ${text(joinParts([evo.method, evo.requirement, evo.conditions]))}`);
    return `
      <article class="card pokemon-card">
        <div class="pokemon-head">
          ${sprite(entry)}
          <div class="pokemon-title">
            <div class="pokemon-metrics">
              <span class="metric-badge"><small>Dex</small><strong>#${paddedDex(entry.dex)}</strong></span>
              <span class="metric-badge"><small>BST</small><strong>${value(entry.bst)}</strong></span>
            </div>
            <h3>${text(entry.name)}</h3>
            <div class="type-row">${entry.types.map(typePill).join("")}</div>
          </div>
          <button class="small-button caught-toggle ${caught ? "is-caught" : ""}" type="button" data-caught="${attr(entry.name)}">${caught ? "Caught" : "Mark caught"}</button>
        </div>
        <div class="stat-bars">${statBars(entry.stats)}</div>
        <div class="chip-row">
          ${entry.abilities.map((ability) => `<span class="chip">${text(ability)}</span>`).join("")}
        </div>
        ${availability}
        <div class="chip-row">
          <button class="chip-button" type="button" data-add-team="${attr(entry.name)}">Add to team</button>
          <button class="chip-button" type="button" data-add-planner="${attr(entry.name)}">Plan</button>
        </div>
        <details>
          <summary>Details</summary>
          <div class="detail-block">
            <div><h4>Profile</h4><p>${text(joinParts([
              `Catch ${value(entry.catchRate)}`,
              `EXP ${value(entry.expYield)}`,
              entry.growthRate,
              entry.eggGroups.join(" / "),
            ]))}</p></div>
            <div><h4>Held items</h4><p>${text(joinParts([
              entry.heldItems.common ? `Common: ${entry.heldItems.common}` : "",
              entry.heldItems.rare ? `Rare: ${entry.heldItems.rare}` : "",
            ]) || "None listed")}</p></div>
            <div><h4>Evolution</h4><p>${[...evoIn, ...evoOut].join("<br>") || "No evolution data listed."}</p></div>
            <div><h4>Level moves</h4><p>${levelMoves || "None listed."}</p></div>
            <div><h4>TM/HM moves</h4><p>${tmMoves || "None listed."}</p></div>
            <div><h4>Tutor moves</h4><p>${tutorMoves || "None listed."}</p></div>
            <div><h4>Egg moves</h4><p>${eggMoves || "None listed."}</p></div>
          </div>
        </details>
      </article>
    `;
  }

  function renderAvailability(entry) {
    const wild = entry.wildLocations;
    const statics = entry.staticLocations;
    const pieces = [];
    if (wild.length) {
      pieces.push(`<span class="chip">Wild: ${text(wild.slice(0, 4).join(", "))}${wild.length > 4 ? ` +${wild.length - 4}` : ""}</span>`);
    }
    if (statics.length) {
      pieces.push(`<span class="chip">Static: ${text(statics.slice(0, 3).join(", "))}${statics.length > 3 ? ` +${statics.length - 3}` : ""}</span>`);
    }
    if (!pieces.length) pieces.push('<span class="chip">No location listed</span>');
    return `<div class="chip-row">${pieces.join("")}</div>`;
  }

  function renderLocations() {
    const query = normalize(filters.locationSearch);
    const filtered = data.locations.filter((location) => {
      const haystack = normalize([
        location.name,
        ...location.rows.flatMap((row) => [
          row.time,
          ...Object.entries(row.methods).flatMap(([method, encounters]) => [
            method,
            ...encounters.map((encounter) => `${encounter.species} ${encounter.level} ${encounter.rate}`),
          ]),
        ]),
      ].join(" "));
      return !query || haystack.includes(query);
    });
    els.locationCount.textContent = `Showing ${filtered.length} of ${data.locations.length}`;
    els.locationList.innerHTML = filtered.map(renderLocationCard).join("") || empty("No locations match that search.");
  }

  function renderLocationCard(location) {
    return `
      <article class="location-card">
        <header>
          <h3>${text(location.name)}</h3>
          <span class="chip">${value(location.speciesCount)} species</span>
        </header>
        <div class="table-wrap">
          <table class="encounter-table">
            <thead><tr><th>Time</th><th>Method</th><th>Encounters</th></tr></thead>
            <tbody>
              ${location.rows
                .flatMap((row) =>
                  Object.entries(row.methods).map(
                    ([method, encounters]) => `
                      <tr>
                        <td>${text(row.time)}</td>
                        <td>${text(method)}</td>
                        <td>${encounters.map((encounter) => `<span class="chip">${text(encounter.species)} ${value(encounter.rate)}% Lv ${text(encounter.level)}</span>`).join(" ")}</td>
                      </tr>
                    `,
                  ),
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
    `;
  }

  function renderItems() {
    const query = normalize(filters.itemSearch);
    const filtered = data.items.filter((item) => {
      const haystack = normalize([
        item.name,
        item.type,
        item.move,
        item.locations,
        item.wildCommonSpecies.join(" "),
        item.wildRareSpecies.join(" "),
        item.notes,
      ].join(" "));
      return (!query || haystack.includes(query)) && (!filters.itemType || item.type === filters.itemType);
    });
    els.itemCount.textContent = `Showing ${filtered.length} of ${data.items.length}`;
    els.itemTable.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Item</th><th>Type</th><th>Move</th><th>Locations</th><th>Held by</th></tr></thead>
        <tbody>
          ${filtered
            .map(
              (item) => `
                <tr>
                  <td><strong>${text(item.name)}</strong>${item.notes ? `<br><small>${text(item.notes)}</small>` : ""}</td>
                  <td>${text(item.type)}</td>
                  <td>${text(item.move || "")}</td>
                  <td>${text(item.locations || "")}</td>
                  <td>${heldSpecies(item)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function renderMoves() {
    const query = normalize(filters.moveSearch);
    const filtered = data.moves.filter((move) => {
      const displayCategory = effectiveCategory(move);
      const haystack = normalize([move.name, move.effect, move.flags, displayCategory, move.type].join(" "));
      return (
        (!query || haystack.includes(query)) &&
        (!filters.moveType || move.type === filters.moveType) &&
        (!filters.moveCategory || displayCategory === filters.moveCategory)
      );
    });
    els.moveCount.textContent = `Showing ${filtered.length} of ${data.moves.length}`;
    els.moveTable.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Move</th><th>Type</th><th>Cat.</th><th>Power</th><th>Acc.</th><th>PP</th><th>Effect</th></tr></thead>
        <tbody>
          ${filtered
            .map(
              (move) => `
                <tr>
                  <td><strong>${text(move.name)}</strong></td>
                  <td>${typePill(move.type)}</td>
                  <td>${text(effectiveCategory(move))}</td>
                  <td>${value(move.power)}</td>
                  <td>${value(move.accuracy)}</td>
                  <td>${value(move.pp)}</td>
                  <td>${text(joinParts([move.effect, move.flags]))}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function renderTrainers() {
    const query = normalize(filters.trainerSearch);
    const filtered = data.trainers.filter((trainer) => {
      const haystack = normalize([
        trainer.category,
        trainer.name,
        ...trainer.team.flatMap((mon) => [mon.species, mon.item, ...mon.moves]),
      ].join(" "));
      return (!query || haystack.includes(query)) && (!filters.trainerCategory || trainer.category === filters.trainerCategory);
    });
    els.trainerCount.textContent = `Showing ${filtered.length} of ${data.trainers.length}`;
    els.trainerList.innerHTML = filtered.map(renderTrainerCard).join("") || empty("No trainers match that search.");
  }

  function renderTrainerCard(trainer) {
    return `
      <article class="trainer-card">
        <header>
          <div>
            <small class="muted">${text(trainer.category)}</small>
            <h3>${text(trainer.name)}</h3>
          </div>
          <span class="chip">${trainer.team.length} Pokemon</span>
        </header>
        <div class="trainer-team">
          ${trainer.team
            .map(
              (mon) => `
                <div class="trainer-mon">
                  <strong>${text(mon.species)}${mon.level ? ` Lv ${value(mon.level)}` : ""}</strong>
                  ${mon.item ? `<small>Item: ${text(mon.item)}</small>` : ""}
                  ${mon.moves.length ? `<div class="mini-list">${mon.moves.map((move) => `<span class="chip">${text(move)}</span>`).join("")}</div>` : ""}
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function renderRules() {
    els.rulesPanel.innerHTML = `
      <label class="rule-toggle"><input type="checkbox" data-rule="fairy" ${state.rules.fairy ? "checked" : ""} /> Fairy type</label>
      <label class="rule-toggle"><input type="checkbox" data-rule="physicalSplit" ${state.rules.physicalSplit ? "checked" : ""} /> Physical/special split</label>
    `;
  }

  function renderTeam() {
    els.teamGrid.innerHTML = state.team.map((slot, index) => renderTeamSlot(slot, index)).join("");
  }

  function renderTeamSlot(slot, index) {
    const entry = speciesByName.get(slot.species);
    const moveChoices = entry ? compatibleMoves(entry) : [];
    const abilityOptions = ["", ...(entry?.abilities || [])].map((ability) => option(ability, ability || "Ability")).join("");
    return `
      <article class="slot-card">
        <header>
          <h3>Slot ${index + 1}</h3>
          <button class="small-button" type="button" data-clear-team="${index}">Clear</button>
        </header>
        ${entry ? `<div class="slot-preview">${sprite(entry)}<div><strong>${text(entry.name)}</strong><div class="type-row">${entry.types.map(typePill).join("")}</div></div></div>` : ""}
        <div class="slot-body">
          <label class="field"><span>Pokemon</span><select data-team-species="${index}">${speciesSelect(slot.species)}</select></label>
          <label class="field"><span>Ability</span><select data-team-ability="${index}">${abilityOptions}</select></label>
          <div class="move-grid">
            ${[0, 1, 2, 3]
              .map(
                (moveIndex) => `
                  <label class="field"><span>Move ${moveIndex + 1}</span><select data-team-slot="${index}" data-team-move="${moveIndex}">
                    ${moveSelect(moveChoices, slot.moves[moveIndex])}
                  </select></label>
                `,
              )
              .join("")}
          </div>
        </div>
      </article>
    `;
  }

  function renderPlanner() {
    els.plannerGrid.innerHTML = state.planner.map((slot, index) => renderPlannerSlot(slot, index)).join("");
  }

  function renderPlannerSlot(slot, index) {
    const entry = speciesByName.get(slot.species);
    return `
      <article class="slot-card">
        <header>
          <h3>Plan ${index + 1}</h3>
          <button class="small-button" type="button" data-clear-planner="${index}">Clear</button>
        </header>
        ${entry ? `<div class="slot-preview">${sprite(entry)}<div><strong>${text(entry.name)}</strong><div class="type-row">${entry.types.map(typePill).join("")}</div></div></div>` : ""}
        <label class="field"><span>Pokemon</span><select data-planner-species="${index}">${speciesSelect(slot.species)}</select></label>
        ${entry ? renderAvailability(entry) : '<div class="availability-box muted">Pick a Pokemon to see locations.</div>'}
        <label class="field"><span>Notes</span><textarea data-planner-note="${index}" placeholder="Role, nature, route timing, item plan">${text(slot.note || "")}</textarea></label>
      </article>
    `;
  }

  function renderBattlePlanner() {
    els.battleTargets.innerHTML = `
      <h3>Targets</h3>
      <p class="muted">Pick opposing Pokemon, then compare against the damaging moves selected in Team Builder.</p>
      ${[0, 1]
        .map(
          (index) => `
            <label class="target-row"><span class="muted">Target ${index + 1}</span><select data-battle-target="${index}">${speciesSelect(state.battleTargets[index])}</select></label>
          `,
        )
        .join("")}
    `;
    const recommendations = getBattleRecommendations();
    els.battleResults.innerHTML = `
      <h3>Recommendations</h3>
      <div class="recommendations">
        ${recommendations.length ? recommendations.map(renderRecommendation).join("") : empty("Add Pokemon and damaging moves in Team Builder, then pick a target.")}
      </div>
    `;
  }

  function getBattleRecommendations() {
    const targets = state.battleTargets.map((name) => speciesByName.get(name)).filter(Boolean);
    if (!targets.length) return [];
    const choices = [];
    state.team.forEach((slot) => {
      const user = speciesByName.get(slot.species);
      if (!user) return;
      slot.moves.filter(Boolean).forEach((moveName) => {
        const move = moveByName.get(moveName);
        if (!move || effectiveCategory(move) === "Status" || Number(move.power || 0) <= 0) return;
        targets.forEach((target) => {
          const multiplier = typeMultiplier(move.type, target.types);
          choices.push({ user, move, target, multiplier });
        });
      });
    });
    return choices
      .sort((a, b) => b.multiplier - a.multiplier || Number(b.move.power || 0) - Number(a.move.power || 0))
      .slice(0, 24);
  }

  function renderRecommendation(item) {
    const score = item.multiplier >= 4 ? "4" : item.multiplier >= 2 ? "2" : item.multiplier === 0 ? "0" : "1";
    return `
      <div class="recommendation" data-score="${score}">
        <strong>${text(item.user.name)} uses ${text(item.move.name)} into ${text(item.target.name)}</strong>
        <span>${typePill(item.move.type)} ${text(effectiveCategory(item.move))} / ${value(item.move.power)} power / ${item.multiplier}x effectiveness</span>
      </div>
    `;
  }

  function renderMore() {
    els.moreGrid.innerHTML = `
      <article class="more-card">
        <header><h3>FAQ</h3><span class="chip">${data.faq.length} entries</span></header>
        ${data.faq
          .map(
            (item) => `
              <details>
                <summary>${text(item.question)}</summary>
                <div class="detail-block"><p>${text(joinParts([item.answer, item.detail]))}</p></div>
              </details>
            `,
          )
          .join("")}
      </article>
      <article class="more-card">
        <header><h3>Completion</h3></header>
        <div class="mini-list">${data.completion.map((item) => `<span class="chip">${text(item.subcategory)}: ${text(item.requirement)}</span>`).join("")}</div>
      </article>
      <article class="more-card">
        <header><h3>Gym Rematches</h3></header>
        <div class="table-wrap">${simpleTable(data.rematches, ["leader", "location", "when"])}</div>
      </article>
      <article class="more-card">
        <header><h3>Move Tutors</h3><span class="chip">${data.tutors.length}</span></header>
        <div class="table-wrap">${simpleTable(data.tutors, ["move", "location", "cost"])}</div>
      </article>
      <article class="more-card">
        <header><h3>Berries and Kurt Balls</h3><span class="chip">${data.berries.length}</span></header>
        <div class="table-wrap">${simpleTable(data.berries, ["berry", "function", "location", "ball", "ballEffectiveness"])}</div>
      </article>
      <article class="more-card">
        <header><h3>Credits</h3></header>
        <div class="table-wrap">${simpleTable(data.credits, ["role", "names"])}</div>
      </article>
    `;
  }

  function renderSave() {
    const save = makeSaveDocument();
    els.savePanel.innerHTML = `
      <article class="save-card">
        <header><h3>Progress Summary</h3></header>
        <div class="chip-row">
          <span class="chip">${caughtCount()} caught</span>
          <span class="chip">${state.team.filter((slot) => slot.species).length} team slots</span>
          <span class="chip">${state.planner.filter((slot) => slot.species).length} planned</span>
          <span class="chip">Revision ${save.revision}</span>
        </div>
        <p class="notice">Cloud sync is not wired in this MVP yet. Export/import gives us portable saves now, and the Dreamstone encrypted sync worker can be adapted next.</p>
      </article>
      <article class="save-card">
        <header><h3>Save Actions</h3></header>
        <div class="save-actions">
          <button class="button" id="export-save" type="button">Export save</button>
          <label class="button" for="import-save-file">Import save</label>
          <input class="sr-only" id="import-save-file" type="file" accept="application/json,.json" />
          <button class="button" id="reset-save" type="button">Reset local save</button>
        </div>
      </article>
    `;
  }

  function showView(viewId) {
    if (!viewId) return;
    els.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === viewId));
    els.views.forEach((view) => view.classList.toggle("is-active", view.id === `view-${viewId}`));
    history.replaceState(null, "", `#${viewId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateCounts() {
    els.stats.species.textContent = data.meta.counts.species;
    els.stats.locations.textContent = data.meta.counts.locations;
    els.stats.items.textContent = data.meta.counts.items;
    els.stats.trainers.textContent = data.meta.counts.trainers;
    els.stats.caught.textContent = caughtCount();
  }

  function addToTeam(name) {
    const slot = state.team.find((entry) => !entry.species);
    if (!slot) {
      showView("team");
      return;
    }
    const entry = speciesByName.get(name);
    slot.species = name;
    slot.ability = entry?.abilities?.[0] || "";
    slot.moves = ["", "", "", ""];
    persistAndRenderTeam();
    showView("team");
  }

  function addToPlanner(name) {
    const slot = state.planner.find((entry) => !entry.species);
    if (!slot) {
      showView("planner");
      return;
    }
    slot.species = name;
    persistAndRenderPlanner();
    showView("planner");
  }

  function persistAndRenderTeam() {
    persist();
    renderTeam();
    renderBattlePlanner();
    renderSave();
  }

  function persistAndRenderPlanner() {
    persist();
    renderPlanner();
    renderSave();
  }

  function rerenderStateful() {
    document.documentElement.dataset.theme = state.theme;
    updateCounts();
    renderRules();
    renderDex();
    renderTeam();
    renderPlanner();
    renderBattlePlanner();
    renderSave();
  }

  function makeSaveDocument() {
    return {
      app: "heart-soul-field-guide",
      version: 1,
      revision: state.revision,
      exportedAt: new Date().toISOString(),
      state,
    };
  }

  function exportSave() {
    const blob = new Blob([JSON.stringify(makeSaveDocument(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `heart-soul-guide-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importSave(file) {
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      const next = sanitizeState(imported.state || imported);
      Object.assign(state, next);
      state.revision += 1;
      persist();
      rerenderStateful();
    } catch (error) {
      alert(`Could not import save: ${error.message}`);
    }
  }

  function persist() {
    state.revision += 1;
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(saveKey, JSON.stringify(state));
  }

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(saveKey) || "null");
      return sanitizeState(stored);
    } catch {
      return defaultState();
    }
  }

  function sanitizeState(input) {
    const fresh = defaultState();
    if (!input || typeof input !== "object") return fresh;
    return {
      theme: input.theme === "dark" ? "dark" : "light",
      revision: Number.isInteger(input.revision) ? input.revision : fresh.revision,
      updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : fresh.updatedAt,
      rules: {
        fairy: typeof input.rules?.fairy === "boolean" ? input.rules.fairy : true,
        physicalSplit: typeof input.rules?.physicalSplit === "boolean" ? input.rules.physicalSplit : true,
      },
      caught: sanitizeCaught(input.caught),
      team: sanitizeSlots(input.team, blankTeamSlot),
      planner: sanitizeSlots(input.planner, blankPlannerSlot),
      battleTargets: sanitizeTargets(input.battleTargets),
    };
  }

  function defaultState() {
    return {
      theme: "light",
      revision: 0,
      updatedAt: new Date().toISOString(),
      rules: { fairy: true, physicalSplit: true },
      caught: {},
      team: Array.from({ length: 6 }, blankTeamSlot),
      planner: Array.from({ length: 6 }, blankPlannerSlot),
      battleTargets: ["", ""],
    };
  }

  function sanitizeCaught(input) {
    const caught = {};
    if (!input || typeof input !== "object") return caught;
    Object.entries(input).forEach(([name, value]) => {
      if (value && speciesByName.has(name)) caught[name] = true;
    });
    return caught;
  }

  function sanitizeSlots(input, factory) {
    return Array.from({ length: 6 }, (_, index) => {
      const raw = Array.isArray(input) ? input[index] : null;
      const slot = factory();
      if (!raw || typeof raw !== "object") return slot;
      if (speciesByName.has(raw.species)) slot.species = raw.species;
      if ("ability" in slot) slot.ability = typeof raw.ability === "string" ? raw.ability : "";
      if ("moves" in slot) slot.moves = Array.from({ length: 4 }, (_, moveIndex) => {
        const move = Array.isArray(raw.moves) ? raw.moves[moveIndex] : "";
        return typeof move === "string" && moveByName.has(move) ? move : "";
      });
      if ("note" in slot) slot.note = typeof raw.note === "string" ? raw.note : "";
      return slot;
    });
  }

  function sanitizeTargets(input) {
    return Array.from({ length: 2 }, (_, index) => {
      const value = Array.isArray(input) ? input[index] : "";
      return speciesByName.has(value) ? value : "";
    });
  }

  function blankTeamSlot() {
    return { species: "", ability: "", moves: ["", "", "", ""] };
  }

  function blankPlannerSlot() {
    return { species: "", note: "" };
  }

  function caughtCount() {
    return Object.values(state.caught).filter(Boolean).length;
  }

  function compatibleMoves(entry) {
    const names = [
      ...entry.learnsets.level.map((move) => move.move),
      ...entry.learnsets.tmhm,
      ...entry.learnsets.tutor,
      ...entry.learnsets.egg,
    ].filter(Boolean);
    return unique(names).sort((a, b) => a.localeCompare(b));
  }

  function effectiveCategory(move) {
    if (!move) return "";
    if (move.category === "Status" || state.rules.physicalSplit) return move.category;
    return gen3SpecialTypes.has(normalizeTypeForRules(move.type)) ? "Special" : "Physical";
  }

  function normalizeTypeForRules(type) {
    if (!state.rules.fairy && type === "Fairy") return "Normal";
    return type;
  }

  function typeMultiplier(moveType, defenderTypes) {
    const attackType = normalizeTypeForRules(moveType);
    return defenderTypes
      .map(normalizeTypeForRules)
      .filter(Boolean)
      .reduce((multiplier, defenderType) => multiplier * (typeChart[attackType]?.[defenderType] ?? 1), 1);
  }

  function createTypeChart() {
    const chart = Object.fromEntries(typeNames.map((type) => [type, {}]));
    const set = (attack, values) => Object.assign(chart[attack], values);
    set("Normal", { Rock: 0.5, Ghost: 0, Steel: 0.5 });
    set("Fire", { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 });
    set("Water", { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 });
    set("Electric", { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 });
    set("Grass", { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 });
    set("Ice", { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 });
    set("Fighting", { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 });
    set("Poison", { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 });
    set("Ground", { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 });
    set("Flying", { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 });
    set("Psychic", { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 });
    set("Bug", { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 });
    set("Rock", { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 });
    set("Ghost", { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 });
    set("Dragon", { Dragon: 2, Steel: 0.5, Fairy: 0 });
    set("Dark", { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 });
    set("Steel", { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 });
    set("Fairy", { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 });
    return chart;
  }

  function speciesSelect(selected) {
    return [option("", "Choose Pokemon"), ...species.map((entry) => option(entry.name, `#${entry.dex} ${entry.name}`, selected === entry.name))].join("");
  }

  function paddedDex(input) {
    const number = Number(input);
    if (!Number.isFinite(number)) return value(input);
    return String(number).padStart(3, "0");
  }

  function moveSelect(moves, selected) {
    return [option("", "Choose move"), ...moves.map((move) => option(move, move, selected === move))].join("");
  }

  function option(value, label, selected = false) {
    return `<option value="${attr(value)}" ${selected ? "selected" : ""}>${text(label)}</option>`;
  }

  function sprite(entry) {
    if (entry.sprite) {
      return `<div class="sprite-box"><img src="${attr(entry.sprite)}" alt="${attr(entry.name)} sprite" loading="lazy" /></div>`;
    }
    return `<div class="sprite-box"><span class="sprite-fallback">${text(entry.name.slice(0, 2).toUpperCase())}</span></div>`;
  }

  function typePill(type) {
    const color = typeColors[type] || typeColors.Mystery;
    return `<span class="type" style="--type-color:${color}">${text(type)}</span>`;
  }

  function statBars(stats) {
    return Object.entries({ HP: stats.hp, Atk: stats.atk, Def: stats.def, SpA: stats.spa, SpD: stats.spd, Spe: stats.spe })
      .map(([label, stat]) => {
        const width = Math.min(100, Math.round((Number(stat || 0) / 180) * 100));
        return `<div class="stat-line"><strong>${label}</strong><span>${value(stat)}</span><div class="bar"><span style="--w:${width}%"></span></div></div>`;
      })
      .join("");
  }

  function heldSpecies(item) {
    const common = item.wildCommonSpecies.length ? `Common: ${item.wildCommonSpecies.join(", ")}` : "";
    const rare = item.wildRareSpecies.length ? `Rare: ${item.wildRareSpecies.join(", ")}` : "";
    return text(joinParts([common, rare]));
  }

  function simpleTable(rows, keys) {
    return `
      <table class="data-table">
        <thead><tr>${keys.map((key) => `<th>${text(labelize(key))}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows
            .map((row) => `<tr>${keys.map((key) => `<td>${text(row[key] || "")}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    `;
  }

  function empty(message) {
    return `<div class="empty">${text(message)}</div>`;
  }

  function labelize(value) {
    return String(value).replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
  }

  function joinParts(parts) {
    return parts.filter((part) => part !== null && part !== undefined && String(part).trim()).join(" / ");
  }

  function unique(values) {
    return [...new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim()))];
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function value(input) {
    return input === null || input === undefined || input === "" ? "" : text(input);
  }

  function text(input) {
    return String(input ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function attr(input) {
    return text(input);
  }
})();

(() => {
  const data = window.HEART_SOUL_DATA;
  if (!data) {
    document.body.innerHTML = "<main class=\"empty\">Guide data did not load.</main>";
    return;
  }

  const saveKey = "heart-soul-field-guide-save-v1";
  const backupKey = "heart-soul-field-guide-backups-v1";
  const saveFormat = "heart-soul-field-guide-save";
  const saveVersion = 1;
  const maxLocalBackups = 5;
  const syncCodePrefix = "HNS1";
  const species = [...data.species].sort((a, b) => Number(a.dex || 0) - Number(b.dex || 0));
  const speciesByName = new Map(species.map((entry) => [entry.name, entry]));
  const moveByName = new Map(data.moves.map((move) => [move.name, move]));
  const itemsByMove = new Map();
  data.items.forEach((item) => {
    if (!item.move) return;
    const list = itemsByMove.get(item.move) || [];
    list.push(item);
    itemsByMove.set(item.move, list);
  });
  const tutorsByMove = new Map(data.tutors.map((tutor) => [tutor.move, tutor]));
  const trainersById = new Map(data.trainers.map((trainer) => [trainer.id, trainer]));
  const trainerCategories = unique(data.trainers.map((trainer) => trainer.category)).sort((a, b) => a.localeCompare(b));
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
    modalRoot: document.querySelector("#modal-root"),
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

      const trainerPlanButton = event.target.closest("[data-plan-trainer]");
      if (trainerPlanButton) {
        planTrainerBattle(trainerPlanButton.dataset.planTrainer);
        return;
      }

      const movesButton = event.target.closest("[data-open-moves]");
      if (movesButton) {
        openMovesModal(movesButton.dataset.openMoves);
        return;
      }

      const speciesJump = event.target.closest("[data-jump-species]");
      if (speciesJump) {
        jumpToSpecies(speciesJump.dataset.jumpSpecies);
        return;
      }

      const locationJump = event.target.closest("[data-jump-location]");
      if (locationJump) {
        jumpToLocation(locationJump.dataset.jumpLocation);
        return;
      }

      const itemJump = event.target.closest("[data-jump-item]");
      if (itemJump) {
        jumpToItem(itemJump.dataset.jumpItem);
        return;
      }

      const moveJump = event.target.closest("[data-jump-move]");
      if (moveJump) {
        jumpToMove(moveJump.dataset.jumpMove);
        return;
      }

      if (event.target.closest("[data-close-modal]")) {
        closeModal();
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

      if (event.target.closest("#create-sync-code")) {
        createSyncCode();
        return;
      }

      if (event.target.closest("#copy-sync-code")) {
        copySyncCode();
        return;
      }

      if (event.target.closest("#load-sync-code")) {
        loadSyncCode();
        return;
      }

      const restoreBackupButton = event.target.closest("[data-restore-backup]");
      if (restoreBackupButton) {
        restoreLocalBackup(restoreBackupButton.dataset.restoreBackup);
        return;
      }

      if (event.target.closest("#reset-save")) {
        if (confirm("Reset caught Pokemon, team, planner, battle settings, and rules?")) {
          saveLocalBackup("Before reset");
          const fresh = defaultState();
          Object.assign(state, fresh);
          persist();
          rerenderStateful();
          setSaveStatus("Local save reset. A recovery backup was kept.", "success");
        }
      }
    });

    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleChange);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });

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
      renderSave();
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
      renderSave();
    } else if (target.matches("[data-team-move]")) {
      const index = Number(target.dataset.teamSlot);
      const moveIndex = Number(target.dataset.teamMove);
      state.team[index].moves[moveIndex] = target.value;
      persist();
      renderBattlePlanner();
      renderSave();
    } else if (target.matches("[data-planner-species]")) {
      const index = Number(target.dataset.plannerSpecies);
      state.planner[index].species = target.value;
      persistAndRenderPlanner();
    } else if (target.matches("[data-battle-mode]")) {
      state.battleMode = target.value === "trainer" ? "trainer" : "custom";
      if (state.battleMode === "trainer") ensureSelectedTrainer();
      persist();
      renderBattlePlanner();
      renderSave();
    } else if (target.matches("#battle-trainer-category")) {
      state.battleTrainerCategory = target.value;
      state.battleTrainerId = firstTrainerForCategory(target.value)?.id || "";
      persist();
      renderBattlePlanner();
      renderSave();
    } else if (target.matches("#battle-trainer-id")) {
      state.battleTrainerId = target.value;
      const trainer = trainersById.get(target.value);
      state.battleTrainerCategory = trainer?.category || state.battleTrainerCategory;
      persist();
      renderBattlePlanner();
      renderSave();
    } else if (target.matches("[data-battle-target]")) {
      state.battleTargets[Number(target.dataset.battleTarget)] = target.value;
      persist();
      renderBattlePlanner();
      renderSave();
    } else if (target.matches("#import-save-file")) {
      importSave(target.files?.[0]);
      target.value = "";
    }
  }

  function renderControls() {
    const typeOptions = ["", ...typeNames].map((type) => option(type, type || "Any type")).join("");
    const itemTypes = unique(data.items.map((item) => item.type)).sort();
    const trainerCategoryOptions = trainerCategories;
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
      <label class="field"><span>Category</span><select id="trainer-category">${option("", "Any category")}${trainerCategoryOptions.map((category) => option(category, category)).join("")}</select></label>
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
    const availability = renderAvailability(entry);
    return `
      <article class="card pokemon-card" data-species-card="${attr(entry.name)}">
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
        <div class="dex-info-grid">
          <div class="dex-info-cell">
            <small>Profile</small>
            <strong>Catch ${value(entry.catchRate)}</strong>
            <span>EXP ${value(entry.expYield)} / ${text(entry.growthRate || "")}</span>
          </div>
          <div class="dex-info-cell">
            <small>Egg groups</small>
            <span>${text(entry.eggGroups.join(" / ") || "None listed")}</span>
          </div>
          <div class="dex-info-cell">
            <small>Held items</small>
            <span>${text(joinParts([
              entry.heldItems.common && entry.heldItems.common !== "None" ? `Common: ${entry.heldItems.common}` : "",
              entry.heldItems.rare && entry.heldItems.rare !== "None" ? `Rare: ${entry.heldItems.rare}` : "",
            ]) || "None listed")}</span>
          </div>
        </div>
        <section class="dex-card-section">
          <h4>Abilities</h4>
          <div class="chip-row">${entry.abilities.map((ability) => `<span class="chip">${text(ability)}</span>`).join("")}</div>
        </section>
        <section class="dex-card-section">
          <h4>Evolution</h4>
          ${renderEvolutionLinks(entry)}
        </section>
        <section class="dex-card-section">
          <h4>Locations</h4>
          ${availability}
        </section>
        <div class="dex-action-row">
          <button class="chip-button" type="button" data-add-team="${attr(entry.name)}">Add to team</button>
          <button class="chip-button" type="button" data-add-planner="${attr(entry.name)}">Plan</button>
          <button class="chip-button primary-chip" type="button" data-open-moves="${attr(entry.name)}">Moves</button>
        </div>
      </article>
    `;
  }

  function renderAvailability(entry) {
    const wild = entry.wildLocations;
    const statics = entry.staticLocations;
    const pieces = [];
    if (wild.length) {
      pieces.push(renderLocationChipGroup("Wild", wild, 4));
    }
    if (statics.length) {
      pieces.push(renderLocationChipGroup("Static", statics, 3));
    }
    if (!pieces.length) pieces.push('<span class="chip">No location listed</span>');
    return `<div class="chip-row">${pieces.join("")}</div>`;
  }

  function renderLocationChipGroup(label, locations, limit) {
    const visible = locations.slice(0, limit);
    const chips = visible
      .map(
        (location, index) => `
          <button class="chip link-chip" type="button" data-jump-location="${attr(location)}">
            ${index === 0 ? `${text(label)}: ` : ""}${text(location)}
          </button>
        `,
      )
      .join("");
    const extra = locations.length > limit ? `<span class="chip">+${locations.length - limit}</span>` : "";
    return `${chips}${extra}`;
  }

  function renderEvolutionLinks(entry) {
    const links = [
      ...entry.evolvesFrom.map((evo) => ({ direction: "From", target: evo.from, detail: joinParts([evo.method, evo.requirement, evo.conditions]) })),
      ...entry.evolutions.map((evo) => ({ direction: "To", target: evo.to, detail: joinParts([evo.method, evo.requirement, evo.conditions]) })),
    ];
    if (!links.length) return '<span class="muted">No evolution data listed.</span>';
    return `
      <div class="evolution-links">
        ${links
          .map((link) => {
            const target = speciesByName.get(link.target);
            return `
              <button class="evolution-link" type="button" data-jump-species="${attr(link.target)}">
                ${miniSprite(target)}
                <span><small>${text(link.direction)}</small><strong>${text(link.target)}</strong><em>${text(link.detail || "Evolution")}</em></span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function openMovesModal(name) {
    const entry = speciesByName.get(name);
    if (!entry || !els.modalRoot) return;
    const rows = collectLearnableMoves(entry);
    els.modalRoot.innerHTML = `
      <div class="modal-backdrop" data-close-modal></div>
      <section class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="moves-modal-title">
        <header class="modal-head">
          <div>
            <small class="muted">Learnset</small>
            <h3 id="moves-modal-title">${text(entry.name)} Moves</h3>
          </div>
          <button class="icon-button" type="button" data-close-modal aria-label="Close moves modal">X</button>
        </header>
        <div class="modal-summary">
          ${sprite(entry)}
          <div>
            <div class="type-row">${entry.types.map(typePill).join("")}</div>
            <div class="chip-row">
              <span class="chip">${rows.length} moves</span>
              <span class="chip">${entry.learnsets.level.length} level</span>
              <span class="chip">${entry.learnsets.tmhm.length} TM/HM</span>
              <span class="chip">${entry.learnsets.tutor.length} tutor</span>
              <span class="chip">${entry.learnsets.egg.length} egg</span>
            </div>
          </div>
        </div>
        <div class="table-wrap modal-table">
          <table class="data-table move-modal-table">
            <thead><tr><th>Move</th><th>Source</th><th>Type</th><th>Cat.</th><th>Power</th><th>Acc.</th><th>Effect</th></tr></thead>
            <tbody>
              ${rows.map(renderMoveModalRow).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
    document.body.classList.add("modal-open");
  }

  function renderMoveModalRow(row) {
    const move = row.move;
    return `
      <tr>
        <td><button class="table-link" type="button" data-jump-move="${attr(move.name)}">${text(move.name)}</button></td>
        <td><div class="source-chip-row">${row.sources.map((source) => renderMoveSourceChip(move.name, source)).join("")}</div></td>
        <td>${typePill(move.type)}</td>
        <td>${text(effectiveCategory(move))}</td>
        <td>${value(move.power)}</td>
        <td>${value(move.accuracy)}</td>
        <td>${text(joinParts([move.effect, move.flags]) || "No additional effect listed.")}</td>
      </tr>
    `;
  }

  function renderMoveSourceChip(moveName, source) {
    if (source.kind === "tmhm") {
      const item = (itemsByMove.get(moveName) || []).find((entry) => entry.type === "TM" || entry.type === "HM");
      if (item) {
        return `<button class="chip link-chip" type="button" data-jump-item="${attr(item.name)}">${text(item.name)}</button>`;
      }
      return '<span class="chip">TM/HM</span>';
    }
    if (source.kind === "tutor") {
      const tutor = tutorsByMove.get(moveName);
      const label = tutor ? `Tutor: ${joinParts([tutor.location, tutor.cost])}` : "Tutor";
      return `<button class="chip link-chip" type="button" data-jump-move="${attr(moveName)}">${text(label)}</button>`;
    }
    return `<span class="chip">${text(source.label)}</span>`;
  }

  function collectLearnableMoves(entry) {
    const rows = new Map();
    const add = (moveName, source) => {
      const move = moveByName.get(moveName);
      if (!move) return;
      const row = rows.get(move.name) || { move, sources: [] };
      if (!row.sources.some((item) => item.label === source.label)) row.sources.push(source);
      rows.set(move.name, row);
    };
    entry.learnsets.level.forEach((item) => add(item.move, { kind: "level", label: item.level ? `Lv ${item.level}` : "Level" }));
    entry.learnsets.tmhm.forEach((move) => add(move, { kind: "tmhm", label: "TM/HM" }));
    entry.learnsets.tutor.forEach((move) => add(move, { kind: "tutor", label: "Tutor" }));
    entry.learnsets.egg.forEach((move) => add(move, { kind: "egg", label: "Egg" }));
    return [...rows.values()].sort(
      (a, b) => sourceSort(a.sources[0]) - sourceSort(b.sources[0]) || a.move.name.localeCompare(b.move.name),
    );
  }

  function sourceSort(source) {
    if (source.kind === "level") {
      const level = Number(String(source.label).replace(/[^0-9]/g, ""));
      return Number.isFinite(level) && level > 0 ? level : 0;
    }
    if (source.kind === "tmhm") return 200;
    if (source.kind === "tutor") return 300;
    if (source.kind === "egg") return 400;
    return 500;
  }

  function closeModal() {
    if (!els.modalRoot?.innerHTML) return;
    els.modalRoot.innerHTML = "";
    document.body.classList.remove("modal-open");
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
      <article class="location-card" data-location-card="${attr(location.name)}">
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
                  <td>${item.move ? `<button class="table-link" type="button" data-jump-move="${attr(item.move)}">${text(item.move)}</button>` : ""}</td>
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
          <div class="trainer-actions">
            <span class="chip">${trainer.team.length} Pokemon</span>
            <button class="small-button" type="button" data-plan-trainer="${attr(trainer.id)}">Plan this trainer</button>
          </div>
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
    const isTrainerMode = state.battleMode === "trainer";
    const trainer = isTrainerMode ? ensureSelectedTrainer() : null;
    const targets = activeBattleTargets();
    const teamMembers = selectedTeamMembers();
    const moveChoices = selectedTeamMoveChoices();

    els.battleTargets.innerHTML = `
      <h3>Targets</h3>
      <p class="muted">Compare your Team Builder moves into custom targets or a documented boss team.</p>
      <div class="mode-toggle" role="radiogroup" aria-label="Battle planner mode">
        <label class="rule-toggle"><input type="radio" name="battle-mode" data-battle-mode value="custom" ${!isTrainerMode ? "checked" : ""} /> Custom targets</label>
        <label class="rule-toggle"><input type="radio" name="battle-mode" data-battle-mode value="trainer" ${isTrainerMode ? "checked" : ""} /> Boss battle</label>
      </div>
      ${isTrainerMode ? renderTrainerBattleControls(trainer) : renderCustomTargetControls()}
      ${isTrainerMode && trainer ? renderTrainerBattlePreview(trainer) : ""}
      ${renderTeamCoverage(teamMembers, moveChoices)}
    `;
    els.battleResults.innerHTML = `
      <h3>${isTrainerMode ? "Boss Matchups" : "Recommendations"}</h3>
      ${renderOffensiveMatchups(targets, moveChoices)}
      ${isTrainerMode ? renderDefensiveThreats(trainer, teamMembers) : ""}
    `;
  }

  function renderCustomTargetControls() {
    return [0, 1]
      .map(
        (index) => `
          <label class="target-row"><span class="muted">Target ${index + 1}</span><select data-battle-target="${index}">${speciesSelect(state.battleTargets[index])}</select></label>
        `,
      )
      .join("");
  }

  function renderTrainerBattleControls(trainer) {
    const category = trainer?.category || state.battleTrainerCategory || trainerCategories[0] || "";
    const trainerOptions = trainersForCategory(category);
    return `
      <div class="battle-controls">
        <label class="field"><span>Category</span><select id="battle-trainer-category">
          ${trainerCategories.map((item) => option(item, item, item === category)).join("")}
        </select></label>
        <label class="field"><span>Trainer</span><select id="battle-trainer-id">
          ${trainerOptions.map((item) => option(item.id, item.name, item.id === trainer?.id)).join("")}
        </select></label>
      </div>
    `;
  }

  function renderTrainerBattlePreview(trainer) {
    return `
      <section class="battle-side-section">
        <header>
          <div>
            <small class="muted">${text(trainer.category)}</small>
            <h4>${text(trainer.name)}</h4>
          </div>
          <span class="chip">${trainer.team.length} targets</span>
        </header>
        <div class="trainer-target-list">
          ${trainer.team.map(renderTrainerTarget).join("")}
        </div>
      </section>
    `;
  }

  function renderTrainerTarget(mon) {
    const entry = speciesByName.get(mon.species) || { name: mon.species, types: [], sprite: "" };
    return `
      <div class="trainer-target">
        ${sprite(entry)}
        <div>
          <strong>${text(mon.species)}${mon.level ? ` Lv ${value(mon.level)}` : ""}</strong>
          <div class="type-row">${entry.types.map(typePill).join("")}</div>
          ${mon.item ? `<small class="muted">${text(mon.item)}</small>` : ""}
        </div>
      </div>
    `;
  }

  function renderTeamCoverage(teamMembers, moveChoices) {
    const offensiveCoverage = typeNames
      .map((defenderType) => ({
        type: defenderType,
        best: moveChoices.length ? Math.max(...moveChoices.map((choice) => typeMultiplier(choice.move.type, [defenderType]))) : 0,
      }))
      .filter((item) => item.best >= 2)
      .sort((a, b) => b.best - a.best || a.type.localeCompare(b.type));
    const defensiveCoverage = typeNames
      .map((attackType) => ({
        type: attackType,
        weak: teamMembers.filter((member) => typeMultiplier(attackType, member.entry.types) >= 2).length,
        resists: teamMembers.filter((member) => {
          const multiplier = typeMultiplier(attackType, member.entry.types);
          return multiplier > 0 && multiplier <= 0.5;
        }).length,
        immune: teamMembers.filter((member) => typeMultiplier(attackType, member.entry.types) === 0).length,
      }))
      .filter((item) => item.weak || item.resists || item.immune)
      .sort((a, b) => b.weak - a.weak || b.immune + b.resists - (a.immune + a.resists) || a.type.localeCompare(b.type));

    return `
      <section class="battle-side-section">
        <header><h4>Team Coverage</h4></header>
        <div class="coverage-block">
          <small class="muted">Super-effective move reach</small>
          <div class="chip-row">
            ${
              offensiveCoverage.length
                ? offensiveCoverage.slice(0, 12).map((item) => `<span class="chip">${text(item.type)} ${effectivenessLabel(item.best)}</span>`).join("")
                : '<span class="chip">Add damaging moves</span>'
            }
          </div>
        </div>
        <div class="coverage-block">
          <small class="muted">Defensive profile</small>
          <div class="coverage-grid">
            ${
              defensiveCoverage.length
                ? defensiveCoverage
                    .slice(0, 10)
                    .map(
                      (item) => `
                        <div class="coverage-line">
                          ${typePill(item.type)}
                          <span>${item.weak} weak</span>
                          <span>${item.resists + item.immune} checks</span>
                        </div>
                      `,
                    )
                    .join("")
                : '<span class="muted">Add Pokemon to Team Builder.</span>'
            }
          </div>
        </div>
      </section>
    `;
  }

  function renderOffensiveMatchups(targets, moveChoices) {
    if (!targets.length) return empty("Pick a target or boss trainer to start comparing matchups.");
    if (!moveChoices.length) return empty("Add Pokemon and damaging moves in Team Builder to see attack recommendations.");
    return `
      <section class="battle-section">
        <header>
          <h4>Offensive Answers</h4>
          <span class="chip">${targets.length} targets</span>
        </header>
        <div class="matchup-grid">
          ${targets.map((target) => renderMatchupCard(target, moveChoices)).join("")}
        </div>
      </section>
    `;
  }

  function renderMatchupCard(target, moveChoices) {
    const answers = getOffensiveAnswersForTarget(target, moveChoices).slice(0, 6);
    return `
      <article class="matchup-card">
        ${renderTargetSummary(target)}
        <div class="answer-list">
          ${answers.map(renderAnswerCard).join("")}
        </div>
      </article>
    `;
  }

  function renderTargetSummary(target) {
    const entry = target.species;
    const mon = target.mon || {};
    return `
      <div class="target-summary">
        ${sprite(entry)}
        <div>
          <strong>${text(entry.name)}${mon.level ? ` Lv ${value(mon.level)}` : ""}</strong>
          <div class="type-row">${entry.types.map(typePill).join("")}</div>
          <div class="chip-row">
            <span class="chip">Dex #${paddedDex(entry.dex)}</span>
            <span class="chip">BST ${value(entry.bst)}</span>
            ${mon.item ? `<span class="chip">${text(mon.item)}</span>` : ""}
          </div>
          ${mon.moves?.length ? `<div class="mini-list">${mon.moves.map((move) => `<span class="chip">${text(move)}</span>`).join("")}</div>` : ""}
        </div>
      </div>
    `;
  }

  function renderAnswerCard(item) {
    const score = scoreForMultiplier(item.multiplier);
    const moveType = normalizeTypeForRules(item.move.type);
    const stab = item.user.types.map(normalizeTypeForRules).includes(moveType);
    return `
      <div class="answer-card" data-score="${score}">
        <strong>${text(item.user.name)} uses ${text(item.move.name)}</strong>
        <div class="answer-meta">
          ${typePill(item.move.type)}
          <span class="chip">${text(effectiveCategory(item.move))}</span>
          <span class="chip">${value(item.move.power)} power</span>
          <span class="chip">${effectivenessLabel(item.multiplier)}</span>
          ${stab ? '<span class="chip">STAB</span>' : ""}
        </div>
      </div>
    `;
  }

  function renderDefensiveThreats(trainer, teamMembers) {
    if (!trainer) return "";
    if (!teamMembers.length) {
      return `
        <section class="battle-section">
          <header><h4>Defensive Threats</h4></header>
          ${empty("Add Pokemon in Team Builder to see what the boss team hits hard or bounces off.")}
        </section>
      `;
    }

    const rows = [];
    trainer.team.forEach((mon) => {
      mon.moves.forEach((moveName) => {
        const move = moveByName.get(moveName);
        if (!isDamagingMove(move)) return;
        teamMembers.forEach((member) => {
          rows.push({
            source: mon,
            move,
            member,
            multiplier: typeMultiplier(move.type, member.entry.types),
          });
        });
      });
    });

    const highRisk = rows
      .filter((row) => row.multiplier >= 2)
      .sort((a, b) => b.multiplier - a.multiplier || Number(b.move.power || 0) - Number(a.move.power || 0))
      .slice(0, 12);
    const pivots = rows
      .filter((row) => row.multiplier < 1)
      .sort((a, b) => a.multiplier - b.multiplier || Number(b.move.power || 0) - Number(a.move.power || 0))
      .slice(0, 12);

    return `
      <section class="battle-section">
        <header>
          <h4>Defensive Threats</h4>
          <span class="chip">${trainer.name}</span>
        </header>
        <div class="threat-columns">
          <div>
            <h5>High Risk</h5>
            <div class="threat-grid">
              ${highRisk.length ? highRisk.map(renderThreatCard).join("") : empty("No 2x or 4x hits found into the current team.")}
            </div>
          </div>
          <div>
            <h5>Possible Pivots</h5>
            <div class="threat-grid">
              ${pivots.length ? pivots.map(renderThreatCard).join("") : empty("No resists or immunities found into the listed boss moves.")}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderThreatCard(item) {
    return `
      <div class="threat-card" data-score="${scoreForMultiplier(item.multiplier)}">
        <strong>${text(item.source.species)} ${text(item.move.name)}</strong>
        <span>Into ${text(item.member.entry.name)}: ${effectivenessLabel(item.multiplier)}</span>
        <div class="answer-meta">
          ${typePill(item.move.type)}
          <span class="chip">${text(effectiveCategory(item.move))}</span>
          <span class="chip">${value(item.move.power)} power</span>
        </div>
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
    const backups = getLocalBackups();
    const syncReady = syncCryptoAvailable();
    els.savePanel.innerHTML = `
      <article class="save-card">
        <header><h3>Progress Summary</h3><span class="chip">Autosaved</span></header>
        <div class="chip-row">
          <span class="chip">${caughtCount()} caught</span>
          <span class="chip">${state.team.filter((slot) => slot.species).length} team slots</span>
          <span class="chip">${state.planner.filter((slot) => slot.species).length} planned</span>
          <span class="chip">${state.battleMode === "trainer" ? `Boss: ${text(selectedBattleTrainer()?.name || "trainer")}` : "Custom battle"}</span>
          <span class="chip">Revision ${save.revision}</span>
          <span class="chip">Updated ${text(formatDate(state.updatedAt))}</span>
        </div>
      </article>
      <article class="save-card">
        <header><h3>File Save</h3></header>
        <div class="save-actions">
          <button class="button" id="export-save" type="button">Export save</button>
          <label class="button" for="import-save-file">Import save</label>
          <input class="sr-only" id="import-save-file" type="file" accept="application/json,.json" />
          <button class="button" id="reset-save" type="button">Reset local save</button>
        </div>
        <p class="save-status" id="save-operation-status" aria-live="polite"></p>
      </article>
      <article class="save-card">
        <header><h3>Encrypted Sync</h3><span class="chip">${syncReady ? "Ready" : "Unavailable"}</span></header>
        <div class="sync-grid">
          <label class="field"><span>Passphrase</span><input id="sync-passphrase" type="password" autocomplete="current-password" placeholder="Private sync phrase" /></label>
          <label class="field"><span>Sync code</span><textarea id="sync-code" class="sync-code-area" spellcheck="false" placeholder="Encrypted save code"></textarea></label>
        </div>
        <div class="save-actions">
          <button class="button" id="create-sync-code" type="button" ${syncReady ? "" : "disabled"}>Create code</button>
          <button class="button" id="copy-sync-code" type="button" ${syncReady ? "" : "disabled"}>Copy code</button>
          <button class="button" id="load-sync-code" type="button" ${syncReady ? "" : "disabled"}>Load code</button>
        </div>
      </article>
      <article class="save-card">
        <header><h3>Recovery</h3><span class="chip">${backups.length} backups</span></header>
        <div class="backup-list">
          ${backups.length ? backups.map(renderBackupEntry).join("") : empty("No recovery backups yet.")}
        </div>
      </article>
    `;
  }

  function renderBackupEntry(backup) {
    return `
      <div class="backup-entry">
        <div>
          <strong>${text(backup.reason || "Recovery backup")}</strong>
          <small class="muted">Revision ${value(backup.revision)} / ${text(formatDate(backup.savedAt))}</small>
        </div>
        <button class="small-button" type="button" data-restore-backup="${attr(backup.id)}">Restore</button>
      </div>
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

  function jumpToSpecies(name) {
    if (!speciesByName.has(name)) return;
    closeModal();
    filters.dexSearch = name;
    filters.dexType = "";
    filters.dexAvailability = "";
    filters.dexCaughtOnly = false;
    renderControls();
    renderDex();
    showView("dex");
  }

  function jumpToLocation(name) {
    closeModal();
    filters.locationSearch = name;
    renderControls();
    renderLocations();
    showView("locations");
  }

  function jumpToItem(search) {
    closeModal();
    filters.itemSearch = search;
    filters.itemType = "";
    renderControls();
    renderItems();
    showView("items");
  }

  function jumpToMove(name) {
    closeModal();
    filters.moveSearch = name;
    filters.moveType = "";
    filters.moveCategory = "";
    renderControls();
    renderMoves();
    showView("moves");
  }

  function planTrainerBattle(trainerId) {
    const trainer = trainersById.get(trainerId);
    if (!trainer) return;
    state.battleMode = "trainer";
    state.battleTrainerCategory = trainer.category;
    state.battleTrainerId = trainer.id;
    persist();
    renderBattlePlanner();
    renderSave();
    showView("battle");
  }

  function firstTrainerForCategory(category) {
    return data.trainers.find((trainer) => trainer.category === category) || data.trainers[0] || null;
  }

  function trainersForCategory(category) {
    return data.trainers.filter((trainer) => trainer.category === category);
  }

  function selectedBattleTrainer() {
    return trainersById.get(state.battleTrainerId) || null;
  }

  function ensureSelectedTrainer() {
    if (!trainerCategories.includes(state.battleTrainerCategory)) {
      state.battleTrainerCategory = trainerCategories[0] || "";
    }
    const current = selectedBattleTrainer();
    if (!current || current.category !== state.battleTrainerCategory) {
      state.battleTrainerId = firstTrainerForCategory(state.battleTrainerCategory)?.id || "";
    }
    return selectedBattleTrainer();
  }

  function activeBattleTargets() {
    if (state.battleMode === "trainer") {
      const trainer = selectedBattleTrainer();
      if (!trainer) return [];
      return trainer.team
        .map((mon, index) => {
          const entry = speciesByName.get(mon.species);
          return entry ? { id: `${trainer.id}-${index}`, trainer, mon, species: entry } : null;
        })
        .filter(Boolean);
    }
    return state.battleTargets
      .map((name, index) => {
        const entry = speciesByName.get(name);
        return entry ? { id: `custom-${index}`, mon: { species: entry.name, moves: [] }, species: entry } : null;
      })
      .filter(Boolean);
  }

  function selectedTeamMembers() {
    return state.team
      .map((slot, index) => {
        const entry = speciesByName.get(slot.species);
        return entry ? { slot, index, entry } : null;
      })
      .filter(Boolean);
  }

  function selectedTeamMoveChoices() {
    return selectedTeamMembers().flatMap((member) =>
      member.slot.moves
        .map((moveName) => moveByName.get(moveName))
        .filter(isDamagingMove)
        .map((move) => ({ member, user: member.entry, move })),
    );
  }

  function getOffensiveAnswersForTarget(target, moveChoices) {
    return moveChoices
      .map((choice) => ({
        ...choice,
        target,
        multiplier: typeMultiplier(choice.move.type, target.species.types),
      }))
      .sort((a, b) => b.multiplier - a.multiplier || Number(b.move.power || 0) - Number(a.move.power || 0));
  }

  function isDamagingMove(move) {
    return Boolean(move && effectiveCategory(move) !== "Status" && Number(move.power || 0) > 0);
  }

  function scoreForMultiplier(multiplier) {
    if (multiplier >= 4) return "4";
    if (multiplier >= 2) return "2";
    if (multiplier === 0) return "0";
    if (multiplier < 1) return "resist";
    return "1";
  }

  function effectivenessLabel(multiplier) {
    if (multiplier === 0) return "Immune";
    if (multiplier === 0.25) return "0.25x";
    if (multiplier === 0.5) return "0.5x";
    if (multiplier === 1) return "1x";
    if (multiplier === 2) return "2x";
    if (multiplier === 4) return "4x";
    return `${multiplier}x`;
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
      format: saveFormat,
      app: "heart-soul-field-guide",
      version: saveVersion,
      revision: state.revision,
      exportedAt: new Date().toISOString(),
      state,
    };
  }

  function validateSaveDocument(input) {
    if (!input || typeof input !== "object") throw new Error("This save file is empty or invalid.");
    if (input.format && (input.format !== saveFormat || input.version !== saveVersion)) {
      throw new Error("This is not a supported Heart & Soul Field Guide save.");
    }
    if (input.app && input.app !== "heart-soul-field-guide") {
      throw new Error("This save belongs to a different guide.");
    }
    return sanitizeState(input.state || input);
  }

  function applySaveDocument(input, { source = "import", createBackup = true } = {}) {
    const next = validateSaveDocument(input);
    if (createBackup) {
      const reason = source === "sync" ? "Before sync load" : source === "backup" ? "Before recovery restore" : "Before import";
      saveLocalBackup(reason);
    }
    Object.assign(state, next);
    persist();
    rerenderStateful();
    return next;
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
    setSaveStatus("Save exported.", "success");
  }

  async function importSave(file) {
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!confirm("Replace this browser's current Heart & Soul progress with the imported save?")) return;
      applySaveDocument(imported, { source: "import" });
      setSaveStatus("Save imported. A recovery backup was kept.", "success");
    } catch (error) {
      setSaveStatus(error.message || "The selected save could not be imported.", "error");
    }
  }

  async function createSyncCode() {
    try {
      const passphrase = syncPassphrase();
      if (!passphrase) throw new Error("Enter a passphrase first.");
      const code = await encryptSyncPayload(makeSaveDocument(), passphrase);
      const output = document.querySelector("#sync-code");
      if (output) output.value = code;
      setSaveStatus("Encrypted sync code created.", "success");
    } catch (error) {
      setSaveStatus(error.message || "Could not create sync code.", "error");
    }
  }

  async function copySyncCode() {
    try {
      const code = document.querySelector("#sync-code")?.value.trim();
      if (!code) throw new Error("Create or paste a sync code first.");
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is not available in this browser.");
      await navigator.clipboard.writeText(code);
      setSaveStatus("Sync code copied.", "success");
    } catch (error) {
      setSaveStatus(error.message || "Could not copy sync code.", "error");
    }
  }

  async function loadSyncCode() {
    try {
      const passphrase = syncPassphrase();
      const code = document.querySelector("#sync-code")?.value.trim();
      if (!passphrase) throw new Error("Enter the passphrase for this sync code.");
      if (!code) throw new Error("Paste a sync code first.");
      const save = await decryptSyncPayload(code, passphrase);
      if (!confirm("Replace this browser's current Heart & Soul progress with the encrypted sync code?")) return;
      applySaveDocument(save, { source: "sync" });
      setSaveStatus("Encrypted sync code loaded. A recovery backup was kept.", "success");
    } catch (error) {
      setSaveStatus(error.message || "Could not load sync code.", "error");
    }
  }

  function syncPassphrase() {
    return document.querySelector("#sync-passphrase")?.value.trim() || "";
  }

  function syncCryptoAvailable() {
    return Boolean(
      window.crypto?.subtle &&
        window.crypto.getRandomValues &&
        window.TextEncoder &&
        window.TextDecoder &&
        window.btoa &&
        window.atob,
    );
  }

  async function encryptSyncPayload(save, passphrase) {
    if (!syncCryptoAvailable()) throw new Error("Encrypted sync is not available in this browser.");
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveSyncKey(passphrase, salt);
    const encoded = new TextEncoder().encode(JSON.stringify(save));
    const encrypted = new Uint8Array(await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded));
    return [syncCodePrefix, bytesToBase64Url(salt), bytesToBase64Url(iv), bytesToBase64Url(encrypted)].join(".");
  }

  async function decryptSyncPayload(code, passphrase) {
    if (!syncCryptoAvailable()) throw new Error("Encrypted sync is not available in this browser.");
    const parts = code.split(".");
    if (parts.length !== 4 || parts[0] !== syncCodePrefix) throw new Error("This is not a Heart & Soul sync code.");
    const salt = base64UrlToBytes(parts[1]);
    const iv = base64UrlToBytes(parts[2]);
    const encrypted = base64UrlToBytes(parts[3]);
    const key = await deriveSyncKey(passphrase, salt);
    try {
      const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch {
      throw new Error("The passphrase does not unlock this sync code.");
    }
  }

  async function deriveSyncKey(passphrase, salt) {
    const baseKey = await window.crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, [
      "deriveKey",
    ]);
    return window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  function bytesToBase64Url(bytes) {
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64UrlToBytes(value) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = window.atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  function getLocalBackups() {
    try {
      const backups = JSON.parse(localStorage.getItem(backupKey) || "[]");
      return Array.isArray(backups) ? backups.filter((backup) => backup && typeof backup === "object") : [];
    } catch {
      return [];
    }
  }

  function saveLocalBackup(reason) {
    const backups = getLocalBackups();
    const backup = {
      id: makeId(),
      reason,
      savedAt: new Date().toISOString(),
      revision: state.revision,
      save: makeSaveDocument(),
    };
    try {
      localStorage.setItem(backupKey, JSON.stringify([backup, ...backups].slice(0, maxLocalBackups)));
    } catch (error) {
      console.warn("Could not store local recovery backup.", error);
    }
  }

  function restoreLocalBackup(id) {
    const backup = getLocalBackups().find((entry) => entry.id === id);
    if (!backup?.save) return;
    if (!confirm("Replace this browser's current Heart & Soul progress with this recovery backup?")) return;
    applySaveDocument(backup.save, { source: "backup", createBackup: true });
    setSaveStatus("Recovery backup restored.", "success");
  }

  function makeId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function setSaveStatus(message, type = "") {
    const status = document.querySelector("#save-operation-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.status = type;
  }

  function persist() {
    state.revision += 1;
    state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(saveKey, JSON.stringify(state));
    } catch (error) {
      console.warn("Could not save local guide state.", error);
      setSaveStatus("Local storage is full or unavailable.", "error");
    }
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
    const battleMode = input.battleMode === "trainer" ? "trainer" : "custom";
    let battleTrainerCategory = trainerCategories.includes(input.battleTrainerCategory) ? input.battleTrainerCategory : fresh.battleTrainerCategory;
    let battleTrainerId = typeof input.battleTrainerId === "string" && trainersById.has(input.battleTrainerId) ? input.battleTrainerId : "";
    const trainer = trainersById.get(battleTrainerId);
    if (trainer && trainer.category !== battleTrainerCategory) battleTrainerId = "";
    if (!battleTrainerId) battleTrainerId = firstTrainerForCategory(battleTrainerCategory)?.id || fresh.battleTrainerId;
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
      battleMode,
      battleTrainerCategory,
      battleTrainerId,
      battleTargets: sanitizeTargets(input.battleTargets),
    };
  }

  function defaultState() {
    const battleTrainerCategory = trainerCategories[0] || "";
    const battleTrainerId = firstTrainerForCategory(battleTrainerCategory)?.id || "";
    return {
      theme: "light",
      revision: 0,
      updatedAt: new Date().toISOString(),
      rules: { fairy: true, physicalSplit: true },
      caught: {},
      team: Array.from({ length: 6 }, blankTeamSlot),
      planner: Array.from({ length: 6 }, blankPlannerSlot),
      battleMode: "custom",
      battleTrainerCategory,
      battleTrainerId,
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

  function miniSprite(entry) {
    if (entry?.sprite) {
      return `<span class="mini-sprite"><img src="${attr(entry.sprite)}" alt="" loading="lazy" /></span>`;
    }
    const label = entry?.name || "?";
    return `<span class="mini-sprite"><span>${text(label.slice(0, 2).toUpperCase())}</span></span>`;
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

  function formatDate(input) {
    if (!input) return "Never";
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return String(input);
    return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
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

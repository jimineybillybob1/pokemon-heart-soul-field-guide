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
  const syncCodeKey = "heart-soul-field-guide-sync-code";
  const syncContextKey = "heart-soul-field-guide-sync-context-v1";
  const syncDeviceKey = "heart-soul-field-guide-sync-device-v1";
  const syncEndpoint = (window.HEART_SOUL_SYNC_ENDPOINT || "").replace(/\/+$/, "");
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const appShellVersion = "heart-soul-field-guide-v22";
  const species = [...data.species].sort((a, b) => Number(a.dex || 0) - Number(b.dex || 0));
  const speciesByName = new Map(species.map((entry) => [entry.name, entry]));
  const speciesByLookup = new Map(species.map((entry) => [normalize(entry.name), entry]));
  const moveByName = new Map(data.moves.map((move) => [move.name, move]));
  const itemsByName = new Map(data.items.map((item) => [item.name, item]));
  const itemsByMove = new Map();
  data.items.forEach((item) => {
    if (!item.move) return;
    const list = itemsByMove.get(item.move) || [];
    list.push(item);
    itemsByMove.set(item.move, list);
  });
  const tutorsByMove = new Map(data.tutors.map((tutor) => [tutor.move, tutor]));
  const trainersById = new Map(data.trainers.map((trainer) => [trainer.id, trainer]));
  const bossCategoryOrder = [
    "Johto Gym Leaders",
    "Johto League",
    "Johto Gym Leader Rematches",
    "Kanto Gym Leaders",
    "Kanto League",
    "Rockets",
    "Rival",
    "Red",
    "Misc",
  ];
  const bossCategoryLookup = new Map(
    bossCategoryOrder.map((label) => [normalize(label), label]).concat([
      ["johto gym leaders", "Johto Gym Leaders"],
      ["johto league", "Johto League"],
      ["johto gym leader rematches", "Johto Gym Leader Rematches"],
      ["kanto gym leaders", "Kanto Gym Leaders"],
      ["kanto league", "Kanto League"],
      ["rockets", "Rockets"],
      ["rival", "Rival"],
      ["red", "Red"],
      ["misc", "Misc"],
    ]),
  );
  const trainerCategories = bossCategoryOrder.filter((category) => data.trainers.some((trainer) => trainerCategoryLabel(trainer) === category));
  const badgeGroups = [
    {
      region: "Johto",
      badges: [
        { id: "zephyr", name: "Zephyr Badge", leader: "Falkner" },
        { id: "hive", name: "Hive Badge", leader: "Bugsy" },
        { id: "plain", name: "Plain Badge", leader: "Whitney" },
        { id: "fog", name: "Fog Badge", leader: "Morty" },
        { id: "storm", name: "Storm Badge", leader: "Chuck" },
        { id: "mineral", name: "Mineral Badge", leader: "Jasmine" },
        { id: "glacier", name: "Glacier Badge", leader: "Pryce" },
        { id: "rising", name: "Rising Badge", leader: "Clair" },
      ],
    },
    {
      region: "Kanto",
      badges: [
        { id: "boulder", name: "Boulder Badge", leader: "Brock" },
        { id: "cascade", name: "Cascade Badge", leader: "Misty" },
        { id: "thunder", name: "Thunder Badge", leader: "Lt. Surge" },
        { id: "rainbow", name: "Rainbow Badge", leader: "Erika" },
        { id: "soul", name: "Soul Badge", leader: "Janine" },
        { id: "marsh", name: "Marsh Badge", leader: "Sabrina" },
        { id: "volcano", name: "Volcano Badge", leader: "Blaine" },
        { id: "earth", name: "Earth Badge", leader: "Blue" },
      ],
    },
  ];
  const badgeDefinitions = badgeGroups.flatMap((group) => group.badges);
  const badgeIds = new Set(badgeDefinitions.map((badge) => badge.id));
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
  const typeBackgrounds = {
    Grass: "assets/type-backgrounds/grass.jpg",
    Fire: "assets/type-backgrounds/fire.jpg",
    Water: "assets/type-backgrounds/water.jpg",
    Electric: "assets/type-backgrounds/electric.jpg",
    Ice: "assets/type-backgrounds/ice.jpg",
    Fighting: "assets/type-backgrounds/fighting.jpg",
    Poison: "assets/type-backgrounds/poison.jpg",
    Ground: "assets/type-backgrounds/ground.jpg",
    Flying: "assets/type-backgrounds/flying.jpg",
    Psychic: "assets/type-backgrounds/psychic.jpg",
    Bug: "assets/type-backgrounds/bug.jpg",
    Rock: "assets/type-backgrounds/rock.jpg",
    Ghost: "assets/type-backgrounds/ghost.jpg",
    Dragon: "assets/type-backgrounds/dragon.jpg",
    Steel: "assets/type-backgrounds/steel.jpg",
    Dark: "assets/type-backgrounds/dark.jpg",
    Fairy: "assets/type-backgrounds/fairy.jpg",
    Normal: "assets/type-backgrounds/normal.jpg",
  };
  const abilityDetails = {
    "stench": "Helps repel wild Pokemon.",
    "drizzle": "Summons rain in battle.",
    "speed boost": "Gradually boosts Speed.",
    "battle armor": "Blocks critical hits.",
    "sturdy": "Negates one-hit KO attacks.",
    "damp": "Prevents self-destruction.",
    "limber": "Prevents paralysis.",
    "sand veil": "Raises evasion in a sandstorm.",
    "static": "May paralyze on contact.",
    "volt absorb": "Restores HP when hit by Electric moves.",
    "water absorb": "Restores HP when hit by Water moves.",
    "oblivious": "Prevents attraction.",
    "cloud nine": "Negates weather effects.",
    "compound eyes": "Raises accuracy.",
    "insomnia": "Prevents sleep.",
    "color change": "Changes type to the foe's move.",
    "immunity": "Prevents poisoning.",
    "flash fire": "Powers up Fire moves if hit by fire.",
    "shield dust": "Prevents added effects.",
    "own tempo": "Prevents confusion.",
    "suction cups": "Firmly anchors the body.",
    "intimidate": "Lowers the foe's Attack.",
    "shadow tag": "Prevents the foe's escape.",
    "rough skin": "Hurts foes on contact.",
    "wonder guard": "Only super effective hits land.",
    "levitate": "Avoids Ground attacks.",
    "effect spore": "May inflict status on contact.",
    "synchronize": "Passes on status problems.",
    "clear body": "Prevents stat reduction.",
    "natural cure": "Heals status when switching out.",
    "lightning rod": "Draws Electric moves.",
    "serene grace": "Boosts added effect chances.",
    "swift swim": "Raises Speed in rain.",
    "chlorophyll": "Raises Speed in sunshine.",
    "illuminate": "Increases encounter rate.",
    "trace": "Copies the foe's ability.",
    "huge power": "Raises Attack.",
    "poison point": "May poison on contact.",
    "inner focus": "Prevents flinching.",
    "magma armor": "Prevents freezing.",
    "water veil": "Prevents burns.",
    "magnet pull": "Traps Steel-type Pokemon.",
    "soundproof": "Avoids sound-based moves.",
    "rain dish": "Slight HP recovery in rain.",
    "sand stream": "Summons a sandstorm.",
    "pressure": "Raises the foe's PP usage.",
    "thick fat": "Reduces Fire and Ice damage.",
    "early bird": "Awakens quickly from sleep.",
    "flame body": "May burn on contact.",
    "run away": "Makes escaping easier.",
    "keen eye": "Prevents accuracy loss.",
    "hyper cutter": "Prevents Attack reduction.",
    "pickup": "May pick up items.",
    "truant": "Moves only every two turns.",
    "hustle": "Trades accuracy for power.",
    "cute charm": "May infatuate on contact.",
    "plus": "Powers up with Minus.",
    "minus": "Powers up with Plus.",
    "forecast": "Changes with the weather.",
    "sticky hold": "Prevents item theft.",
    "shed skin": "May heal status each turn.",
    "guts": "Raises Attack while suffering status.",
    "marvel scale": "Raises Defense while suffering status.",
    "liquid ooze": "Draining moves cause injury.",
    "overgrow": "Powers up Grass moves in a pinch.",
    "blaze": "Powers up Fire moves in a pinch.",
    "torrent": "Powers up Water moves in a pinch.",
    "swarm": "Powers up Bug moves in a pinch.",
    "rock head": "Prevents recoil damage.",
    "drought": "Summons sunlight in battle.",
    "arena trap": "Prevents fleeing.",
    "vital spirit": "Prevents sleep.",
    "white smoke": "Prevents stat reduction.",
    "pure power": "Raises Attack.",
    "shell armor": "Blocks critical hits.",
    "cacophony": "Boosts sound-based moves.",
    "air lock": "Negates weather effects.",
    "transistor": "Powers up Electric-type moves.",
    "dragon s maw": "Powers up Dragon-type moves.",
    "multitype": "Powers up type moves with held items.",
    "pixilate": "Normal moves become Fairy.",
  };
  const gen3SpecialTypes = new Set(["Fire", "Water", "Grass", "Electric", "Ice", "Psychic", "Dragon", "Dark"]);
  const statLabels = [
    ["hp", "HP"],
    ["atk", "Atk"],
    ["def", "Def"],
    ["spa", "SpA"],
    ["spd", "SpD"],
    ["spe", "Spe"],
  ];
  const natures = [
    { name: "Hardy" },
    { name: "Lonely", up: "atk", down: "def" },
    { name: "Brave", up: "atk", down: "spe" },
    { name: "Adamant", up: "atk", down: "spa" },
    { name: "Naughty", up: "atk", down: "spd" },
    { name: "Bold", up: "def", down: "atk" },
    { name: "Docile" },
    { name: "Relaxed", up: "def", down: "spe" },
    { name: "Impish", up: "def", down: "spa" },
    { name: "Lax", up: "def", down: "spd" },
    { name: "Timid", up: "spe", down: "atk" },
    { name: "Hasty", up: "spe", down: "def" },
    { name: "Serious" },
    { name: "Jolly", up: "spe", down: "spa" },
    { name: "Naive", up: "spe", down: "spd" },
    { name: "Modest", up: "spa", down: "atk" },
    { name: "Mild", up: "spa", down: "def" },
    { name: "Quiet", up: "spa", down: "spe" },
    { name: "Bashful" },
    { name: "Rash", up: "spa", down: "spd" },
    { name: "Calm", up: "spd", down: "atk" },
    { name: "Gentle", up: "spd", down: "def" },
    { name: "Sassy", up: "spd", down: "spe" },
    { name: "Careful", up: "spd", down: "spa" },
    { name: "Quirky" },
  ];
  const naturesByName = new Map(natures.map((nature) => [nature.name, nature]));
  const dexBatchSize = 50;
  let dexVisibleCount = dexBatchSize;
  let dexFilteredCount = species.length;
  const viewIds = ["dex", "locations", "items", "moves", "trainers", "team", "planner", "battle", "save"];
  let currentViewId = initialViewId();
  const renderedViews = new Set();
  const dirtyViews = new Set(viewIds);
  let syncCode = uuidPattern.test(localStorage.getItem(syncCodeKey) || "") ? localStorage.getItem(syncCodeKey) : "";
  let syncContext = loadSyncContext();
  let syncSnapshot = null;
  let syncStatus = "unchecked";
  let cloudHistory = [];
  const expandedLocations = new Set();
  const deviceId = loadDeviceId();

  const state = loadState();
  const filters = {
    dexSearch: "",
    dexType: "",
    dexAvailability: "",
    dexCaughtOnly: false,
    dexSort: "dex",
    locationSearch: "",
    locationExact: "",
    locationHideCaught: false,
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
    dashboard: document.querySelector("#dashboard"),
    teamOverview: document.querySelector("#team-overview"),
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
    savePanel: document.querySelector("#save-panel"),
    modalRoot: document.querySelector("#modal-root"),
    themeToggle: document.querySelector("#theme-toggle"),
  };

  const typeChart = createTypeChart();

  init();

  function init() {
    document.documentElement.dataset.theme = state.theme;
    renderThemeToggle();
    updateCounts();
    renderControls();
    renderRules();
    renderTeamOverview();
    bindEvents();
    showView(currentViewId, { scroll: false, replaceHistory: false });
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const viewButton = event.target.closest("[data-view], [data-view-link]");
      if (viewButton) {
        event.preventDefault();
        showView(viewButton.dataset.view || viewButton.dataset.viewLink);
        return;
      }

      if (event.target.closest("#jump-top")) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const clearSearchButton = event.target.closest("[data-clear-search]");
      if (clearSearchButton) {
        const input = clearSearchButton.closest(".search-input-wrap")?.querySelector("input");
        if (input) {
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.focus();
        }
        return;
      }

      const teamSpeciesOption = event.target.closest("[data-team-species-option]");
      if (teamSpeciesOption) {
        event.preventDefault();
        selectTeamSpecies(Number(teamSpeciesOption.dataset.teamSlot), teamSpeciesOption.dataset.teamSpeciesOption);
        return;
      }

      const plannerSpeciesOption = event.target.closest("[data-planner-species-option]");
      if (plannerSpeciesOption) {
        event.preventDefault();
        selectPlannerSpecies(Number(plannerSpeciesOption.dataset.plannerSlot), plannerSpeciesOption.dataset.plannerSpeciesOption);
        return;
      }

      if (!event.target.closest(".species-search-field")) hideTeamSpeciesSuggestions();

      const badgeButton = event.target.closest("[data-badge]");
      if (badgeButton) {
        const badgeId = badgeButton.dataset.badge;
        if (!badgeIds.has(badgeId)) return;
        state.badges[badgeId] = !state.badges[badgeId];
        persist();
        renderDashboard();
        invalidateView("save");
        return;
      }

      const caughtButton = event.target.closest("[data-caught]");
      if (caughtButton) {
        const name = caughtButton.dataset.caught;
        const modalSpecies = caughtButton.closest("[data-species-modal]")?.dataset.speciesModal;
        state.caught[name] = !state.caught[name];
        persist();
        renderDashboard();
        invalidateViews(["dex", "locations", "save"]);
        if (modalSpecies) openSpeciesModal(name);
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
        const fromModal = speciesJump.closest("[data-species-modal]");
        jumpToSpecies(speciesJump.dataset.jumpSpecies);
        if (fromModal) closeModal();
        return;
      }

      const speciesOpen = event.target.closest("[data-open-species]");
      if (speciesOpen) {
        openSpeciesModal(speciesOpen.dataset.openSpecies);
        return;
      }

      const locationSectionButton = event.target.closest("[data-location-sections]");
      if (locationSectionButton) {
        setLocationCardsOpen(locationSectionButton.dataset.locationSections === "expand");
        return;
      }

      const locationHideCaughtButton = event.target.closest("[data-location-hide-caught]");
      if (locationHideCaughtButton) {
        filters.locationHideCaught = !filters.locationHideCaught;
        renderControls();
        renderView("locations", { force: true });
        return;
      }

      const locationFilterButton = event.target.closest("[data-location-filter]");
      if (locationFilterButton) {
        const name = locationFilterButton.dataset.locationFilter || "";
        filters.locationSearch = name;
        filters.locationExact = name;
        if (name) expandedLocations.add(name);
        renderControls();
        renderView("locations", { force: true });
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

      if (event.target.closest("[data-load-more-dex]")) {
        loadMoreDex();
        return;
      }

      const moveSectionButton = event.target.closest("[data-move-sections]");
      if (moveSectionButton) {
        setMoveSectionsOpen(moveSectionButton.dataset.moveSections === "expand");
        return;
      }

      const clearTeam = event.target.closest("[data-clear-team]");
      if (clearTeam) {
        state.team[Number(clearTeam.dataset.clearTeam)] = blankTeamSlot();
        persistAndRenderTeam();
        return;
      }

      const evolveTeam = event.target.closest("[data-evolve-team]");
      if (evolveTeam) {
        evolveTeamSlot(Number(evolveTeam.dataset.evolveTeam), evolveTeam.dataset.evolveTo);
        return;
      }

      const evolvePlanner = event.target.closest("[data-evolve-planner]");
      if (evolvePlanner) {
        evolvePlannerSlot(Number(evolvePlanner.dataset.evolvePlanner), evolvePlanner.dataset.evolveTo);
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

      if (event.target.closest("#check-cloud-save")) {
        checkSyncStatus().catch((error) => setSaveStatus(error.message || "Could not check the cloud save.", "error"));
        return;
      }

      if (event.target.closest("#upload-cloud-save")) {
        uploadCurrentSave().catch((error) => setSaveStatus(error.message || "Could not save to cloud.", "error"));
        return;
      }

      if (event.target.closest("#download-cloud-save")) {
        loadCloudSave().catch((error) => setSaveStatus(error.message || "Could not load from cloud.", "error"));
        return;
      }

      if (event.target.closest("#use-local-save")) {
        if (confirm("Keep this device's save and replace the current cloud copy? Both copies will remain in Recovery versions.")) {
          uploadCurrentSave({ force: true }).catch((error) => setSaveStatus(error.message || "Could not save to cloud.", "error"));
        }
        return;
      }

      if (event.target.closest("#use-cloud-save")) {
        if (confirm("Use the cloud save on this device? The current local copy will be backed up first.")) {
          loadCloudSave({ force: true }).catch((error) => setSaveStatus(error.message || "Could not load from cloud.", "error"));
        }
        return;
      }

      if (event.target.closest("#refresh-sync-history")) {
        loadCloudHistory().catch((error) => setSaveStatus(error.message || "Could not load cloud recovery versions.", "error"));
        return;
      }

      const cloudRestoreButton = event.target.closest("[data-restore-cloud]");
      if (cloudRestoreButton) {
        restoreCloudVersion(cloudRestoreButton.dataset.restoreCloud).catch((error) =>
          setSaveStatus(error.message || "Could not restore that cloud version.", "error"),
        );
        return;
      }

      if (event.target.closest("#forget-sync-code")) {
        forgetSyncCode();
        return;
      }

      if (event.target.closest("#check-version")) {
        checkLatestVersion();
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
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", (event) => {
      if ((event.target.matches("[data-team-species]") || event.target.matches("[data-planner-species]")) && event.key === "Enter") {
        const match = teamSpeciesMatches(event.target.value)[0];
        if (match) {
          event.preventDefault();
          if (event.target.matches("[data-team-species]")) selectTeamSpecies(Number(event.target.dataset.teamSpecies), match.name);
          else selectPlannerSpecies(Number(event.target.dataset.plannerSpecies), match.name);
        }
        return;
      }
      if (event.key === "Escape") closeModal();
    });
    document.addEventListener(
      "toggle",
      (event) => {
        const details = event.target;
        if (!(details instanceof HTMLDetailsElement) || !details.matches("[data-location-card]")) return;
        const name = details.dataset.locationCard;
        if (!name) return;
        if (details.open) expandedLocations.add(name);
        else expandedLocations.delete(name);
      },
      true,
    );
    if (window.addEventListener) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    els.themeToggle.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = state.theme;
      renderThemeToggle();
      persist();
    });
  }

  function renderThemeToggle() {
    if (!els.themeToggle) return;
    const isDark = state.theme === "dark";
    els.themeToggle.dataset.themeState = state.theme;
    els.themeToggle.setAttribute("aria-pressed", String(isDark));
    els.themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  }

  function handleInput(event) {
    const target = event.target;
    if (target.matches("#dex-search")) {
      filters.dexSearch = target.value;
      resetDexLimit();
      renderDex();
    } else if (target.matches("#location-search")) {
      filters.locationSearch = target.value;
      filters.locationExact = "";
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
    } else if (target.matches("[data-team-species]")) {
      updateTeamSpeciesSuggestions(target);
    } else if (target.matches("[data-planner-species]")) {
      updatePlannerSpeciesSuggestions(target);
    } else if (target.matches("[data-team-nickname]")) {
      const index = Number(target.dataset.teamNickname);
      state.team[index].nickname = cleanTeamNickname(target.value);
      persist();
      renderTeamOverview();
      invalidateView("save");
    } else if (target.matches("[data-planner-nickname]")) {
      const index = Number(target.dataset.plannerNickname);
      state.planner[index].nickname = cleanTeamNickname(target.value);
      persist();
      invalidateView("save");
    } else if (target.matches("[data-planner-note]")) {
      const index = Number(target.dataset.plannerNote);
      state.planner[index].note = target.value;
      persist();
    } else if (target.matches("#sync-code")) {
      syncCode = target.value.trim().toLowerCase();
      if (syncCode) localStorage.setItem(syncCodeKey, syncCode);
      else localStorage.removeItem(syncCodeKey);
      if (syncCode) ensureSyncContext(syncCode);
      syncSnapshot = null;
      cloudHistory = [];
      updateSyncControls();
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (target.matches("#dex-type")) {
      filters.dexType = target.value;
      resetDexLimit();
      renderDex();
    } else if (target.matches("#dex-availability")) {
      filters.dexAvailability = target.value;
      resetDexLimit();
      renderDex();
    } else if (target.matches("#dex-caught-only")) {
      filters.dexCaughtOnly = target.checked;
      resetDexLimit();
      renderDex();
    } else if (target.matches("#dex-sort")) {
      filters.dexSort = target.value;
      resetDexLimit();
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
      invalidateViews(["team", "battle", "save"]);
    } else if (target.matches("[data-team-species]")) {
      selectTeamSpecies(Number(target.dataset.teamSpecies), target.value, { allowClear: true });
    } else if (target.matches("[data-team-ability]")) {
      state.team[Number(target.dataset.teamAbility)].ability = target.value;
      persist();
      invalidateViews(["battle", "save"]);
    } else if (target.matches("[data-team-nature]")) {
      state.team[Number(target.dataset.teamNature)].nature = naturesByName.has(target.value) ? target.value : "";
      persistAndRenderTeam();
    } else if (target.matches("[data-team-item]")) {
      updateTeamItem(Number(target.dataset.teamItem), target.value, target);
    } else if (target.matches("[data-team-move]")) {
      const index = Number(target.dataset.teamSlot);
      const moveIndex = Number(target.dataset.teamMove);
      state.team[index].moves[moveIndex] = target.value;
      persistAndRenderTeam();
    } else if (target.matches("[data-planner-species]")) {
      selectPlannerSpecies(Number(target.dataset.plannerSpecies), target.value, { allowClear: true });
    } else if (target.matches("[data-planner-ability]")) {
      state.planner[Number(target.dataset.plannerAbility)].ability = target.value;
      persistAndRenderPlanner();
    } else if (target.matches("[data-planner-nature]")) {
      state.planner[Number(target.dataset.plannerNature)].nature = naturesByName.has(target.value) ? target.value : "";
      persistAndRenderPlanner();
    } else if (target.matches("[data-planner-item]")) {
      updatePlannerItem(Number(target.dataset.plannerItem), target.value, target);
    } else if (target.matches("[data-planner-move]")) {
      const index = Number(target.dataset.plannerSlot);
      const moveIndex = Number(target.dataset.plannerMove);
      state.planner[index].moves[moveIndex] = target.value;
      persistAndRenderPlanner();
    } else if (target.matches("[data-battle-mode]")) {
      state.battleMode = target.value === "trainer" ? "trainer" : "custom";
      if (state.battleMode === "trainer") ensureSelectedTrainer();
      persist();
      invalidateViews(["battle", "save"]);
    } else if (target.matches("#battle-trainer-category")) {
      state.battleTrainerCategory = target.value;
      state.battleTrainerId = firstTrainerForCategory(target.value)?.id || "";
      persist();
      invalidateViews(["battle", "save"]);
    } else if (target.matches("#battle-trainer-id")) {
      state.battleTrainerId = target.value;
      const trainer = trainersById.get(target.value);
      state.battleTrainerCategory = trainer ? trainerCategoryLabel(trainer) : state.battleTrainerCategory;
      persist();
      invalidateViews(["battle", "save"]);
    } else if (target.matches("[data-battle-target]")) {
      state.battleTargets[Number(target.dataset.battleTarget)] = target.value;
      persist();
      invalidateViews(["battle", "save"]);
    } else if (target.matches("#import-save-file")) {
      importSave(target.files?.[0]);
      target.value = "";
    }
  }

  function handleFocusIn(event) {
    const target = event.target;
    if (target.matches("[data-team-species]")) updateTeamSpeciesSuggestions(target);
    if (target.matches("[data-planner-species]")) updatePlannerSpeciesSuggestions(target);
  }

  function renderControls() {
    const typeOptions = ["", ...typeNames].map((type) => option(type, type || "Any type")).join("");
    const itemTypes = unique(data.items.map((item) => item.type)).sort();
    const trainerCategoryOptions = trainerCategories;
    const dexSortOptions = [
      ["dex", "Dex number"],
      ["name", "Name"],
      ["bst", "BST"],
      ["hp", "HP"],
      ["atk", "Attack"],
      ["def", "Defense"],
      ["spa", "Sp. Atk"],
      ["spd", "Sp. Def"],
      ["spe", "Speed"],
    ];
    els.dexControls.innerHTML = `
      <label class="field grow"><span>Search</span>${clearableSearchInput({ id: "dex-search", value: filters.dexSearch, placeholder: "Pokemon, ability, item, location" })}</label>
      <label class="field"><span>Type</span><select id="dex-type">${typeOptions}</select></label>
      <label class="field"><span>Availability</span><select id="dex-availability">
        ${option("", "Any availability")}
        ${option("wild", "Wild")}
        ${option("static", "Static, gift, trade")}
        ${option("none", "No location listed")}
      </select></label>
      <label class="field"><span>Sort by</span><select id="dex-sort">${dexSortOptions.map(([value, label]) => option(value, label, filters.dexSort === value)).join("")}</select></label>
      <label class="field checkbox-field"><span>Progress</span><span class="check-control"><input id="dex-caught-only" type="checkbox" ${filters.dexCaughtOnly ? "checked" : ""} /> Caught only</span></label>
    `;
    els.locationControls.innerHTML = `
      <label class="field grow"><span>Search</span>${clearableSearchInput({ id: "location-search", value: filters.locationSearch, placeholder: "Location, Pokemon, method, time" })}</label>
      <div class="toolbar-actions">
        <button class="small-button toggle-button ${filters.locationHideCaught ? "is-active" : ""}" type="button" data-location-hide-caught aria-pressed="${filters.locationHideCaught ? "true" : "false"}">${filters.locationHideCaught ? "Showing uncaught" : "Hide caught"}</button>
        <button class="small-button" type="button" data-location-sections="expand">Expand all</button>
        <button class="small-button" type="button" data-location-sections="collapse">Collapse all</button>
      </div>
      <div class="location-quick-filters" aria-label="Quick location filters">
        <button class="location-filter-button ${filters.locationSearch ? "" : "is-active"}" type="button" data-location-filter="">All locations</button>
        ${data.locations.map((location) => renderLocationFilterButton(location)).join("")}
      </div>
    `;
    els.itemControls.innerHTML = `
      <label class="field grow"><span>Search</span>${clearableSearchInput({ id: "item-search", value: filters.itemSearch, placeholder: "Item, move, location, held species" })}</label>
      <label class="field"><span>Type</span><select id="item-type">${option("", "Any type")}${itemTypes.map((type) => option(type, type)).join("")}</select></label>
    `;
    els.moveControls.innerHTML = `
      <label class="field grow"><span>Search</span>${clearableSearchInput({ id: "move-search", value: filters.moveSearch, placeholder: "Move, description, type" })}</label>
      <label class="field"><span>Type</span><select id="move-type">${typeOptions}</select></label>
      <label class="field"><span>Category</span><select id="move-category">
        ${option("", "Any category")}
        ${option("Physical", "Physical")}
        ${option("Special", "Special")}
        ${option("Status", "Status")}
      </select></label>
    `;
    els.trainerControls.innerHTML = `
      <label class="field grow"><span>Search</span>${clearableSearchInput({ id: "trainer-search", value: filters.trainerSearch, placeholder: "Boss, group, Pokemon, move" })}</label>
      <label class="field"><span>Category</span><select id="trainer-category">${option("", "Any category")}${trainerCategoryOptions.map((category) => option(category, category)).join("")}</select></label>
    `;
  }

  function renderLocationFilterButton(location) {
    const selected = filters.locationExact === location.name;
    return `
      <button class="location-filter-button ${selected ? "is-active" : ""}" type="button" data-location-filter="${attr(location.name)}">
        ${text(location.name)}
      </button>
    `;
  }

  function clearableSearchInput({ id = "", value = "", placeholder = "", type = "search", attributes = "" } = {}) {
    const idPart = id ? ` id="${attr(id)}"` : "";
    const attributePart = attributes ? ` ${attributes}` : "";
    return `
      <span class="search-input-wrap">
        <input${idPart} type="${attr(type)}"${attributePart} value="${attr(value || "")}" placeholder="${attr(placeholder)}" />
        <button class="search-clear" type="button" data-clear-search aria-label="Clear search">x</button>
      </span>
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
    const sorted = sortSpecies(filtered);
    dexFilteredCount = sorted.length;
    const visible = sorted.slice(0, dexVisibleCount);
    els.dexCount.textContent = `Showing ${visible.length} of ${filtered.length}`;
    els.dexGrid.innerHTML =
      visible.map(renderDexCard).join("") +
        (sorted.length > visible.length
          ? `<div class="load-more-card"><button class="button" type="button" data-load-more-dex>Load more</button><span class="muted">${sorted.length - visible.length} remaining</span></div>`
          : "") || empty("No Pokemon match those filters.");
  }

  function sortSpecies(entries) {
    const sortKey = filters.dexSort || "dex";
    return [...entries].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) || Number(a.dex || 0) - Number(b.dex || 0);
      if (sortKey === "dex") return Number(a.dex || 0) - Number(b.dex || 0) || a.name.localeCompare(b.name);
      const diff = Number(sortValue(b, sortKey)) - Number(sortValue(a, sortKey));
      return diff || Number(a.dex || 0) - Number(b.dex || 0) || a.name.localeCompare(b.name);
    });
  }

  function sortValue(entry, sortKey) {
    if (sortKey === "bst") return entry.bst || 0;
    return entry.stats?.[sortKey] || 0;
  }

  function renderDexCard(entry) {
    const caught = Boolean(state.caught[entry.name]);
    const availability = renderAvailability(entry);
    const abilities = displayAbilities(entry);
    return `
      <article class="card pokemon-card type-backed" data-species-card="${attr(entry.name)}"${typeBackdropStyle(entry)}>
        <div class="pokemon-head">
          ${sprite(entry)}
          <div class="pokemon-title">
            <div class="pokemon-metrics">
              <span class="metric-badge"><small>Dex</small><strong>#${paddedDex(entry.dex)}</strong></span>
              <span class="metric-badge"><small>BST</small><strong>${value(entry.bst)}</strong></span>
            </div>
            <h3 title="${attr(entry.name)}">${text(entry.name)}</h3>
            <div class="type-row">${entry.types.map(typePill).join("")}</div>
          </div>
          <button class="small-button caught-toggle ${caught ? "is-caught" : ""}" type="button" data-caught="${attr(entry.name)}">${caught ? "Caught" : "Mark caught"}</button>
        </div>
        <div class="stat-bars">${statBars(entry.stats)}</div>
        <section class="dex-card-section">
          <h4>Abilities</h4>
          <div class="chip-row ability-row">${abilities.length ? abilities.map(renderAbilityButton).join("") : '<span class="chip">No ability listed</span>'}</div>
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

  function displayAbilities(entry) {
    const records = [];
    (entry.abilities || []).forEach((ability) => records.push({ name: abilityName(ability), hidden: abilityIsHidden(ability) }));
    [entry.hiddenAbility, ...(entry.hiddenAbilities || [])].forEach((ability) => {
      if (ability) records.push({ name: abilityName(ability), hidden: true });
    });
    const merged = [];
    records.forEach((record) => {
      if (!record.name) return;
      const existing = merged.find((item) => normalize(item.name) === normalize(record.name));
      if (existing) {
        existing.hidden = existing.hidden || record.hidden;
      } else {
        merged.push(record);
      }
    });
    const realAbilities = merged.filter((ability) => normalize(ability.name) !== "none");
    if (realAbilities.length) return realAbilities;
    return merged.length === 1 ? merged : [];
  }

  function renderAbilityButton(ability) {
    const record = typeof ability === "string" ? { name: ability, hidden: false } : ability;
    const detail = abilityDetails[normalize(record.name)] || "No ability details listed.";
    return `
      <button class="ability-button" type="button" aria-label="${attr(`${record.name}: ${detail}`)}">
        <span>${text(record.name)}</span>
        ${record.hidden ? '<span class="ability-tag">HA</span>' : ""}
        <span class="ability-popover" role="tooltip">${text(detail)}</span>
      </button>
    `;
  }

  function abilityName(ability) {
    if (!ability) return "";
    if (typeof ability === "object") return ability.name || ability.ability || "";
    return String(ability);
  }

  function abilityIsHidden(ability) {
    return Boolean(
      ability &&
        typeof ability === "object" &&
        (ability.hidden || ability.isHidden || normalize(ability.slot) === "hidden" || normalize(ability.kind) === "hidden"),
    );
  }

  function defaultAbility(entry) {
    return displayAbilities(entry)[0]?.name || "";
  }

  function resetDexLimit() {
    dexVisibleCount = dexBatchSize;
  }

  function loadMoreDex() {
    if (dexVisibleCount >= dexFilteredCount) return;
    dexVisibleCount = Math.min(dexVisibleCount + dexBatchSize, dexFilteredCount);
    renderDex();
  }

  function handleScroll() {
    updateJumpTop();
    if (currentViewId !== "dex" || dexVisibleCount >= dexFilteredCount) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const viewport = window.innerHeight || document.documentElement.clientHeight || 0;
    const pageHeight = document.documentElement.scrollHeight || 0;
    if (scrollTop + viewport >= pageHeight - 700) loadMoreDex();
  }

  function updateJumpTop() {
    const button = document.querySelector("#jump-top");
    if (!button) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    button.classList.toggle("is-visible", scrollTop > 500);
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
    const hidden = locations.slice(limit);
    const chips = visible
      .map(
        (location, index) => `
          <button class="chip link-chip" type="button" data-jump-location="${attr(location)}">
            ${index === 0 ? `${text(label)}: ` : ""}${text(location)}
          </button>
        `,
      )
      .join("");
    const extra = hidden.length
      ? `
        <details class="location-chip-disclosure">
          <summary class="chip">+${hidden.length}</summary>
          <div class="chip-row location-chip-extra">
            ${hidden
              .map(
                (location) => `
                  <button class="chip link-chip" type="button" data-jump-location="${attr(location)}">${text(location)}</button>
                `,
              )
              .join("")}
          </div>
        </details>
      `
      : "";
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
                <span><small>${text(link.direction)}</small><strong title="${attr(link.target)}">${text(link.target)}</strong><em>${text(link.detail || "Evolution")}</em></span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function openSpeciesModal(name) {
    const entry = speciesByName.get(name);
    if (!entry || !els.modalRoot) return;
    const caught = Boolean(state.caught[entry.name]);
    const abilities = displayAbilities(entry);
    els.modalRoot.innerHTML = `
      <div class="modal-backdrop" data-close-modal></div>
      <section class="modal-panel species-modal type-backed" role="dialog" aria-modal="true" aria-labelledby="species-modal-title" data-species-modal="${attr(entry.name)}"${typeBackdropStyle(entry)}>
        <header class="modal-head species-modal-head">
          <div class="species-modal-title">
            ${sprite(entry)}
            <div>
              <div class="pokemon-metrics">
                <span class="metric-badge"><small>Dex</small><strong>#${paddedDex(entry.dex)}</strong></span>
                <span class="metric-badge"><small>BST</small><strong>${value(entry.bst)}</strong></span>
              </div>
              <h3 id="species-modal-title" title="${attr(entry.name)}">${text(entry.name)}</h3>
              <div class="type-row">${entry.types.map(typePill).join("")}</div>
            </div>
          </div>
          <div class="species-modal-actions">
            <button class="small-button caught-toggle ${caught ? "is-caught" : ""}" type="button" data-caught="${attr(entry.name)}">${caught ? "Caught" : "Mark caught"}</button>
            <button class="icon-button" type="button" data-close-modal aria-label="Close Pokemon details">X</button>
          </div>
        </header>
        <div class="species-modal-body">
          <section class="species-panel species-panel-stats">
            <h4>Stats</h4>
            <div class="stat-bars">${statBars(entry.stats)}</div>
          </section>
          <section class="species-panel species-panel-abilities">
            <h4>Abilities</h4>
            <div class="chip-row ability-row">${abilities.length ? abilities.map(renderAbilityButton).join("") : '<span class="chip">No ability listed</span>'}</div>
          </section>
          <section class="species-panel species-panel-evolution">
            <h4>Evolution</h4>
            ${renderEvolutionLinks(entry)}
          </section>
          <section class="species-panel species-panel-locations">
            <h4>Locations</h4>
            ${renderAvailability(entry)}
          </section>
          <div class="dex-action-row species-modal-links">
            <button class="chip-button" type="button" data-add-team="${attr(entry.name)}">Add to team</button>
            <button class="chip-button" type="button" data-add-planner="${attr(entry.name)}">Plan</button>
            <button class="chip-button primary-chip" type="button" data-open-moves="${attr(entry.name)}">Moves</button>
            <button class="chip-button" type="button" data-jump-species="${attr(entry.name)}">Open in Dex</button>
          </div>
        </div>
      </section>
    `;
    document.body.classList.add("modal-open");
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
            <thead><tr><th>Move</th><th>Source</th><th>Type</th><th>Cat.</th><th>Power</th><th>Acc.</th><th>Description</th></tr></thead>
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
        <td>${text(moveDescription(move))}</td>
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
    const filtered = getFilteredLocations();
    els.locationCount.textContent = `Showing ${filtered.length} of ${data.locations.length}`;
    els.locationList.innerHTML = filtered.map(renderLocationCard).join("") || empty("No locations match that search.");
  }

  function getFilteredLocations() {
    const query = normalize(filters.locationSearch);
    if (filters.locationExact) {
      return data.locations.filter((location) => location.name === filters.locationExact && locationHasUncaughtSpecies(location));
    }
    return data.locations.filter((location) => {
      if (!locationHasUncaughtSpecies(location)) return false;
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
  }

  function locationHasUncaughtSpecies(location) {
    if (!filters.locationHideCaught) return true;
    const progress = locationCatchProgress(location);
    return progress.caught < progress.total;
  }

  function renderLocationCard(location) {
    const groups = groupLocationRows(location.rows);
    const isOpen = expandedLocations.has(location.name);
    const progress = locationCatchProgress(location);
    return `
      <details class="location-card" data-location-card="${attr(location.name)}" ${isOpen ? "open" : ""}>
        <summary class="location-card-summary">
          <span class="location-progress-track" aria-hidden="true"><span style="width:${progress.percent}%"></span></span>
          <span class="location-card-title">
            <h3>${text(location.name)}</h3>
          </span>
          <span class="location-card-meta">
            <span class="chip">${value(progress.caught)} / ${value(progress.total)} caught</span>
            <span class="chip">${value(location.speciesCount)} species</span>
          </span>
        </summary>
        <div class="location-card-body">
          <div class="location-time-sections">
            ${groups.map(renderLocationTimeSection).join("")}
          </div>
        </div>
      </details>
    `;
  }

  function locationCatchProgress(location) {
    const names = unique(
      location.rows.flatMap((row) =>
        Object.values(row.methods || {}).flatMap((encounters) => encounters.map((encounter) => encounter.species)),
      ),
    );
    const caught = names.filter((name) => state.caught[name]).length;
    const total = names.length || 0;
    const percent = total ? Math.round((caught / total) * 100) : 0;
    return { caught, total, percent };
  }

  function groupLocationRows(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const label = row.time || "Any time";
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(row);
    });
    return [...groups.entries()]
      .map(([time, timeRows]) => ({ time, rows: timeRows }))
      .sort((a, b) => locationTimeRank(a.time) - locationTimeRank(b.time) || a.time.localeCompare(b.time));
  }

  function locationTimeRank(time) {
    const value = normalize(time);
    if (value.includes("day")) return 1;
    if (value.includes("night")) return 2;
    if (value.includes("morning")) return 0;
    return 3;
  }

  function renderLocationTimeSection(group) {
    const methodSections = group.rows
      .flatMap((row) => Object.entries(row.methods).map(([method, encounters]) => renderLocationMethod(method, encounters)))
      .filter(Boolean)
      .join("");
    const encounterCount = group.rows.reduce(
      (total, row) =>
        total +
        Object.values(row.methods).reduce((sum, encounters) => sum + visibleLocationEncounters(encounters).length, 0),
      0,
    );
    return `
      <details class="location-time-section" open>
        <summary><span>${text(group.time)}</span><span class="section-count">${value(encounterCount)}</span></summary>
        <div class="location-method-list">
          ${methodSections || '<p class="muted">All listed Pokemon are caught for this time.</p>'}
        </div>
      </details>
    `;
  }

  function renderLocationMethod(method, encounters) {
    const visible = visibleLocationEncounters(encounters);
    if (!visible.length) return "";
    return `
      <section class="location-method">
        <h4>${text(method)}</h4>
        <div class="encounter-list">${visible.map(renderEncounterButton).join("")}</div>
      </section>
    `;
  }

  function visibleLocationEncounters(encounters) {
    if (!filters.locationHideCaught) return encounters;
    return encounters.filter((encounter) => !state.caught[encounter.species]);
  }

  function setLocationCardsOpen(expand) {
    if (expand) {
      getFilteredLocations().forEach((location) => expandedLocations.add(location.name));
    } else {
      expandedLocations.clear();
    }
    renderLocations();
  }

  function renderEncounterButton(encounter) {
    const entry = speciesByName.get(encounter.species);
    const caught = Boolean(state.caught[encounter.species]);
    return `
      <button class="encounter-link type-backed ${caught ? "is-caught" : ""}" type="button" data-open-species="${attr(encounter.species)}"${typeBackdropStyle(entry)}>
        ${miniSprite(entry)}
        <span>
          <strong>${text(encounter.species)}</strong>
          <small>${value(encounter.rate)}% encounter / Lv ${text(encounter.level)}</small>
        </span>
        ${caught ? '<em>Caught</em>' : ""}
      </button>
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
        item.description,
        item.notes,
      ].join(" "));
      return (!query || haystack.includes(query)) && (!filters.itemType || item.type === filters.itemType);
    });
    els.itemCount.textContent = `Showing ${filtered.length} of ${data.items.length}`;
    els.itemTable.innerHTML = `
      <table class="data-table item-data-table">
        <thead><tr><th>Item</th><th>Description</th><th>Type</th><th>Move</th><th>Locations</th><th>Held by</th></tr></thead>
        <tbody>
          ${filtered
            .map(
              (item) => `
                <tr>
                  <td>
                    <div class="item-cell">
                      ${itemIcon(item)}
                      <div><strong>${text(item.name)}</strong>${item.notes ? `<small>${text(item.notes)}</small>` : ""}</div>
                    </div>
                  </td>
                  <td>${text(itemDescription(item))}</td>
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

  function itemIcon(item) {
    const code = item.id.replace(/-/g, "_");
    const fallback = item.type === "TM" || item.type === "HM" ? item.type : item.type.slice(0, 2).toUpperCase();
    return `
      <span class="item-icon">
        <span>${text(fallback)}</span>
        <img src="assets/items/${attr(code)}.png" alt="" loading="lazy" onerror="this.remove()" />
      </span>
    `;
  }

  function renderMoves() {
    const query = normalize(filters.moveSearch);
    const tutorMoveNames = new Set(data.tutors.map((tutor) => tutor.move));
    const filteredMoves = data.moves.filter((move) => {
      const displayCategory = effectiveCategory(move);
      const haystack = normalize([move.name, move.description, displayCategory, move.type].join(" "));
      return (
        (!query || haystack.includes(query)) &&
        (!filters.moveType || move.type === filters.moveType) &&
        (!filters.moveCategory || displayCategory === filters.moveCategory) &&
        !tutorMoveNames.has(move.name)
      );
    });
    const filteredTutors = data.tutors.filter((tutor) => {
      const move = moveByName.get(tutor.move);
      const displayCategory = effectiveCategory(move);
      const haystack = normalize([tutor.move, tutor.location, tutor.cost, move?.description, displayCategory, move?.type].join(" "));
      return (
        (!query || haystack.includes(query)) &&
        (!filters.moveType || move?.type === filters.moveType) &&
        (!filters.moveCategory || displayCategory === filters.moveCategory)
      );
    });
    els.moveCount.textContent = `Showing ${filteredMoves.length} moves and ${filteredTutors.length} tutors`;
    els.moveTable.innerHTML = `
      <div class="move-section-actions">
        <button class="small-button" type="button" data-move-sections="expand">Expand all</button>
        <button class="small-button" type="button" data-move-sections="collapse">Collapse all</button>
      </div>
      <details class="move-section" data-move-section>
        <summary><span>Move catalogue</span><span class="section-count">${filteredMoves.length}</span></summary>
        ${renderMoveCatalogueTable(filteredMoves)}
      </details>
      <details class="move-section" data-move-section>
        <summary><span>Tutor moves</span><span class="section-count">${filteredTutors.length}</span></summary>
        ${renderTutorMoveTable(filteredTutors)}
      </details>
    `;
  }

  function renderMoveCatalogueTable(rows) {
    if (!rows.length) return empty("No moves match those filters.");
    return `
      <div class="table-wrap">
        <table class="data-table move-data-table">
          <thead><tr><th>Move</th><th>Type</th><th>Cat.</th><th>Power</th><th>Acc.</th><th>PP</th><th>Description</th></tr></thead>
          <tbody>${rows.map(renderMoveTableRow).join("")}</tbody>
        </table>
      </div>
    `;
  }

  function renderTutorMoveTable(rows) {
    if (!rows.length) return empty("No tutor moves match those filters.");
    return `
      <div class="table-wrap">
        <table class="data-table move-data-table">
          <thead><tr><th>Move</th><th>Type</th><th>Cat.</th><th>Power</th><th>Acc.</th><th>Location</th><th>Requirement</th><th>Description</th></tr></thead>
          <tbody>
            ${rows
              .map((tutor) => {
                const move = moveByName.get(tutor.move);
                return `
                  <tr>
                    <td><strong>${text(tutor.move)}</strong></td>
                    <td>${move ? typePill(move.type) : ""}</td>
                    <td>${text(effectiveCategory(move))}</td>
                    <td>${value(move?.power)}</td>
                    <td>${value(move?.accuracy)}</td>
                    <td>${text(tutor.location || "Unknown")}</td>
                    <td>${text(tutor.cost || "None listed")}</td>
                    <td>${text(moveDescription(move))}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderMoveTableRow(move) {
    return `
      <tr>
        <td><strong>${text(move.name)}</strong></td>
        <td>${typePill(move.type)}</td>
        <td>${text(effectiveCategory(move))}</td>
        <td>${value(move.power)}</td>
        <td>${value(move.accuracy)}</td>
        <td>${value(move.pp)}</td>
        <td>${text(moveDescription(move))}</td>
      </tr>
    `;
  }

  function moveDescription(move) {
    if (!move) return "No move details listed.";
    return move.description || "No move description listed.";
  }

  function setMoveSectionsOpen(open) {
    document.querySelectorAll("[data-move-section]").forEach((section) => {
      section.open = open;
    });
  }

  function renderTrainers() {
    const query = normalize(filters.trainerSearch);
    const filtered = data.trainers.filter((trainer) => {
      const category = trainerCategoryLabel(trainer);
      const haystack = normalize([
        trainer.category,
        category,
        trainer.name,
        ...trainer.team.flatMap((mon) => [mon.species, mon.item, ...mon.moves]),
      ].join(" "));
      return (!query || haystack.includes(query)) && (!filters.trainerCategory || category === filters.trainerCategory);
    });
    els.trainerCount.textContent = `Showing ${filtered.length} of ${data.trainers.length}`;
    els.trainerList.innerHTML = filtered.map(renderTrainerCard).join("") || empty("No trainers match that search.");
  }

  function renderTrainerCard(trainer) {
    return `
      <article class="trainer-card">
        <header>
          <div class="trainer-heading">
            ${trainerSprite(trainer)}
            <div>
              <small class="muted">${text(trainerCategoryLabel(trainer))}</small>
              <h3 title="${attr(trainer.name)}">${text(trainer.name)}</h3>
            </div>
          </div>
          <div class="trainer-actions">
            <span class="chip">${trainer.team.length} Pokemon</span>
            <button class="small-button" type="button" data-plan-trainer="${attr(trainer.id)}">Plan this trainer</button>
          </div>
        </header>
        <div class="trainer-team">
          ${trainer.team
            .map(renderTrainerMon)
            .join("")}
        </div>
      </article>
    `;
  }

  function renderTrainerMon(mon) {
    const entry = speciesByName.get(mon.species);
    return `
      <div class="trainer-mon type-backed"${typeBackdropStyle(entry)}>
        ${miniSprite(entry)}
        <div class="trainer-mon-body">
          <strong title="${attr(mon.species)}">${text(mon.species)}${mon.level ? ` Lv ${value(mon.level)}` : ""}</strong>
          ${entry ? `<div class="type-row">${entry.types.map(typePill).join("")}</div>` : ""}
          ${mon.item ? `<small class="trainer-held-item">Item: ${text(mon.item)}</small>` : ""}
          ${mon.moves.length ? `<div class="mini-list trainer-move-list">${mon.moves.map(renderTrainerMoveChip).join("")}</div>` : ""}
        </div>
      </div>
    `;
  }

  function renderTrainerMoveChip(moveName) {
    const move = moveByName.get(moveName);
    return `
      <span class="chip move-chip" tabindex="0">
        ${text(moveName)}
        <span class="move-tooltip">
          <strong>${text(moveName)}</strong>
          ${move ? `<span>${typePill(move.type)} <em>${text(effectiveCategory(move))}</em></span>` : ""}
          ${move ? `<span>Power ${value(move.power)} / Acc ${value(move.accuracy)}</span>` : ""}
          <small>${text(moveDescription(move))}</small>
        </span>
      </span>
    `;
  }

  function trainerSprite(trainer) {
    const path = trainerSpritePath(trainer);
    const initials = String(trainer.name || "?")
      .replace(/[_-]+/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
    return `
      <span class="trainer-avatar">
        <span>${text(initials || "?")}</span>
        ${path ? `<img src="${attr(path)}" alt="" loading="lazy" onerror="this.remove()" />` : ""}
      </span>
    `;
  }

  function trainerSpritePath(trainer) {
    const category = normalize(trainer.category);
    const rawName = String(trainer.name || "").split("\n")[0].split(" - ")[0].trim();
    const baseName = rawName
      .replace(/^Rival_.+$/i, "Rival")
      .replace(/_?\d+$/g, "")
      .replace(/_+/g, " ")
      .trim();
    const slug = slugify(baseName);
    const special = {
      blue: "leader_blue",
      ltsurge: "surge",
      lt_surge: "surge",
      lance: category.includes("league") ? "champion_lance" : "lance",
      rival: "silver",
    };
    const file =
      special[slug] ||
      (category.includes("gym") && !["brock", "misty", "erika", "janine", "sabrina", "blaine"].includes(slug) ? `leader_${slug}` : "") ||
      (category.includes("league") ? `elite_four_${slug}` : "") ||
      slug;
    return file ? `assets/trainers/${file}.png` : "";
  }

  function renderRules() {
    els.rulesPanel.innerHTML = "";
  }

  function renderTeam() {
    els.teamGrid.innerHTML = `
      <datalist id="team-item-list">${data.items.map((item) => `<option value="${attr(item.name)}"></option>`).join("")}</datalist>
      ${renderTeamOffensiveSummary()}
      ${state.team.map((slot, index) => renderTeamSlot(slot, index)).join("")}
    `;
    renderTeamOverview();
  }

  function renderTeamSlot(slot, index) {
    const entry = speciesByName.get(slot.species);
    const moveChoices = entry ? compatibleMoves(entry) : [];
    const item = itemsByName.get(slot.item);
    const abilityOptions = teamAbilityOptions(entry, slot.ability);
    return `
      <article class="slot-card ${entry ? "type-backed" : ""}"${typeBackdropStyle(entry)}>
        <header>
          <h3>Slot ${index + 1}</h3>
          <button class="small-button" type="button" data-clear-team="${index}">Clear</button>
        </header>
        ${
          entry
            ? `<div class="slot-preview">${sprite(entry)}<div><strong title="${attr(entry.name)}">${text(slot.nickname || entry.name)}</strong><span class="muted">${text(entry.name)}</span><div class="type-row">${entry.types.map(typePill).join("")}</div></div></div>`
            : '<div class="slot-empty">Search for a Pokemon to start this slot.</div>'
        }
        <div class="slot-body">
          <div class="team-field-grid">
            <div class="field species-search-field">
              <span>Pokemon</span>
              ${clearableSearchInput({
                value: slot.species,
                placeholder: "Search Pokemon",
                type: "text",
                attributes: `data-team-species="${index}" autocomplete="off" aria-autocomplete="list" aria-controls="team-species-suggestions-${index}"`,
              })}
              <div class="species-suggestion-box" id="team-species-suggestions-${index}" data-team-species-suggestions="${index}" hidden></div>
            </div>
            <label class="field"><span>Nickname</span><input data-team-nickname="${index}" value="${attr(slot.nickname || "")}" maxlength="32" placeholder="Optional nickname" /></label>
            <label class="field"><span>Nature</span><select data-team-nature="${index}">${natureOptions(slot.nature)}</select></label>
            <label class="field"><span>Ability</span><select data-team-ability="${index}" ${entry ? "" : "disabled"}>${abilityOptions}</select></label>
            <label class="field team-item-field"><span>Held item</span>${clearableSearchInput({
              value: slot.item || "",
              placeholder: "Search held item",
              type: "text",
              attributes: `data-team-item="${index}" list="team-item-list" autocomplete="off"`,
            })}</label>
          </div>
          ${renderTeamItemSummary(item)}
          ${entry ? renderTeamStats(entry, slot.nature) : ""}
          <div class="move-grid">
            ${[0, 1, 2, 3]
              .map(
                (moveIndex) => `
                  <div class="move-field">
                    <label class="field"><span>Move ${moveIndex + 1}</span><select data-team-slot="${index}" data-team-move="${moveIndex}">
                      ${moveSelect(moveChoices, slot.moves[moveIndex])}
                    </select></label>
                    ${renderTeamMoveSummary(slot.moves[moveIndex])}
                  </div>
                `,
              )
              .join("")}
          </div>
          ${entry ? renderEvolutionControls(entry, index) : ""}
        </div>
      </article>
    `;
  }

  function renderTeamOffensiveSummary() {
    const moves = selectedTeamMoveChoices().map((choice) => choice.move);
    const covered = new Set(moves.map((move) => move.type).filter(Boolean));
    return `
      <section class="team-offense-summary">
        <header>
          <div>
            <h3>Offensive Coverage</h3>
            <p class="muted">${moves.length ? `${moves.length} damaging moves selected` : "Select damage-dealing moves to build coverage."}</p>
          </div>
          <span class="chip">${covered.size} / ${typeNames.length} types</span>
        </header>
        <div class="coverage-type-grid">
          ${typeNames
            .map((type) => {
              const count = moves.filter((move) => move.type === type).length;
              return `<span class="coverage-type ${count ? "is-covered" : "is-missing"}" style="--type-color:${typeColors[type] || typeColors.Mystery}"><strong>${text(type)}</strong><small>${count ? `${count} move${count === 1 ? "" : "s"}` : "Missing"}</small></span>`;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function renderTeamOverview() {
    if (!els.teamOverview) return;
    els.teamOverview.innerHTML = state.team
      .map((slot, index) => {
        const entry = speciesByName.get(slot.species);
        const label = cleanTeamNickname(slot.nickname) || entry?.name || `Slot ${index + 1}`;
        return `
          <button class="team-overview-slot ${entry ? "has-pokemon type-backed" : ""}" type="button" data-view-link="team"${typeBackdropStyle(entry)}>
            <div class="team-overview-sprite">${entry ? sprite(entry) : `<span>${index + 1}</span>`}</div>
            <strong title="${attr(label)}">${text(label)}</strong>
            <small>${entry ? text(entry.name) : "Empty"}</small>
          </button>
        `;
      })
      .join("");
  }

  function natureOptions(selected) {
    return [
      option("", "Neutral / unset"),
      ...natures.map((nature) => {
        const detail = nature.up && nature.down ? ` (+${statName(nature.up)} / -${statName(nature.down)})` : " (neutral)";
        return option(nature.name, `${nature.name}${detail}`, selected === nature.name);
      }),
    ].join("");
  }

  function teamAbilityOptions(entry, selected) {
    if (!entry) return option("", "Choose Pokemon first");
    const abilities = displayAbilities(entry);
    if (!abilities.length) return option("", "No ability listed");
    const selectedAbility = abilities.some((ability) => ability.name === selected) ? selected : defaultAbility(entry);
    return abilities.map((ability) => option(ability.name, ability.hidden ? `${ability.name} (HA)` : ability.name, selectedAbility === ability.name)).join("");
  }

  function selectTeamSpecies(index, rawName, { allowClear = false } = {}) {
    const name = String(rawName || "").trim();
    const entry = speciesByName.get(name) || speciesByLookup.get(normalize(name));
    if (!entry) {
      if (allowClear && !name) {
        const current = state.team[index] || blankTeamSlot();
        state.team[index] = { ...blankTeamSlot(), nature: current.nature || "", item: current.item || "", nickname: current.nickname || "" };
        persistAndRenderTeam();
      }
      return;
    }
    const current = state.team[index] || blankTeamSlot();
    const caughtChanged = maybeMarkCaughtForTeam(entry);
    state.team[index] = {
      species: entry.name,
      ability: defaultAbility(entry),
      moves: ["", "", "", ""],
      nature: current.nature || "",
      item: current.item || "",
      nickname: current.nickname || "",
    };
    persistAndRenderTeam();
    if (caughtChanged) {
      updateCounts();
      invalidateViews(["dex", "locations"]);
    }
  }

  function updateTeamSpeciesSuggestions(target) {
    const panel = target.closest(".species-search-field")?.querySelector("[data-team-species-suggestions]");
    if (!panel) return;
    const index = Number(target.dataset.teamSpecies);
    const matches = teamSpeciesMatches(target.value);
    panel.hidden = false;
    panel.innerHTML = renderTeamSpeciesSuggestions(matches, index, target.value);
  }

  function hideTeamSpeciesSuggestions() {
    document.querySelectorAll("[data-team-species-suggestions], [data-planner-species-suggestions]").forEach((panel) => {
      panel.hidden = true;
      panel.innerHTML = "";
    });
  }

  function teamSpeciesMatches(query) {
    const needle = normalize(query);
    const candidates = needle
      ? species.filter((entry) => normalize(entry.name).includes(needle))
      : species.slice(0, 8);
    return candidates
      .sort((a, b) => {
        const aName = normalize(a.name);
        const bName = normalize(b.name);
        const aStarts = needle && aName.startsWith(needle) ? 0 : 1;
        const bStarts = needle && bName.startsWith(needle) ? 0 : 1;
        return aStarts - bStarts || Number(a.dex || 0) - Number(b.dex || 0);
      })
      .slice(0, 8);
  }

  function renderTeamSpeciesSuggestions(matches, index, query) {
    if (!matches.length) {
      return `<div class="species-suggestion-empty">No Pokemon match ${text(query || "that search")}.</div>`;
    }
    return matches
      .map(
        (entry) => `
          <button class="species-suggestion type-backed" type="button" data-team-slot="${index}" data-team-species-option="${attr(entry.name)}"${typeBackdropStyle(entry)}>
            ${miniSprite(entry)}
            <span>
              <strong>${text(entry.name)}</strong>
              <small>${text(entry.types.join(" / ") || "No type listed")}</small>
            </span>
          </button>
        `,
      )
      .join("");
  }

  function updatePlannerSpeciesSuggestions(target) {
    const panel = target.closest(".species-search-field")?.querySelector("[data-planner-species-suggestions]");
    if (!panel) return;
    const index = Number(target.dataset.plannerSpecies);
    const matches = teamSpeciesMatches(target.value);
    panel.hidden = false;
    panel.innerHTML = renderPlannerSpeciesSuggestions(matches, index, target.value);
  }

  function renderPlannerSpeciesSuggestions(matches, index, query) {
    if (!matches.length) {
      return `<div class="species-suggestion-empty">No Pokemon match ${text(query || "that search")}.</div>`;
    }
    return matches
      .map(
        (entry) => `
          <button class="species-suggestion type-backed" type="button" data-planner-slot="${index}" data-planner-species-option="${attr(entry.name)}"${typeBackdropStyle(entry)}>
            ${miniSprite(entry)}
            <span>
              <strong>${text(entry.name)}</strong>
              <small>${text(entry.types.join(" / ") || "No type listed")}</small>
            </span>
          </button>
        `,
      )
      .join("");
  }

  function selectPlannerSpecies(index, rawName, { allowClear = false } = {}) {
    const name = String(rawName || "").trim();
    const entry = speciesByName.get(name) || speciesByLookup.get(normalize(name));
    if (!entry) {
      if (allowClear && !name) {
        const current = state.planner[index] || blankPlannerSlot();
        state.planner[index] = { ...blankPlannerSlot(), nature: current.nature || "", item: current.item || "", nickname: current.nickname || "", note: current.note || "" };
        persistAndRenderPlanner();
      }
      return;
    }
    const current = state.planner[index] || blankPlannerSlot();
    state.planner[index] = {
      species: entry.name,
      ability: defaultAbility(entry),
      moves: ["", "", "", ""],
      nature: current.nature || "",
      item: current.item || "",
      nickname: current.nickname || "",
      note: current.note || "",
    };
    persistAndRenderPlanner();
  }

  function updatePlannerItem(index, itemName, target) {
    const item = itemsByName.get(itemName);
    state.planner[index].item = item ? item.name : "";
    if (!item && target) target.value = "";
    persist();
    const summary = target?.closest(".slot-card")?.querySelector("[data-planner-item-summary]");
    if (summary) summary.outerHTML = renderPlannerItemSummary(item);
    invalidateView("save");
  }

  function renderPlannerItemSummary(item) {
    if (!item) return '<div class="held-item-summary is-empty" data-planner-item-summary><span class="muted">No held item selected.</span></div>';
    const details = itemDescription(item);
    return `
      <div class="held-item-summary" data-planner-item-summary>
        ${itemIcon(item)}
        <div>
          <strong>${text(item.name)}</strong>
          <small>${text(details || item.type)}</small>
        </div>
      </div>
    `;
  }

  function updateTeamItem(index, itemName, target) {
    const item = itemsByName.get(itemName);
    state.team[index].item = item ? item.name : "";
    if (!item && target) target.value = "";
    persist();
    const summary = target?.closest(".slot-card")?.querySelector("[data-team-item-summary]");
    if (summary) summary.outerHTML = renderTeamItemSummary(item);
    invalidateView("save");
  }

  function renderTeamItemSummary(item) {
    if (!item) return '<div class="held-item-summary is-empty" data-team-item-summary><span class="muted">No held item selected.</span></div>';
    const details = itemDescription(item);
    return `
      <div class="held-item-summary" data-team-item-summary>
        ${itemIcon(item)}
        <div>
          <strong>${text(item.name)}</strong>
          <small>${text(details || item.type)}</small>
        </div>
      </div>
    `;
  }

  function itemDescription(item) {
    return item?.description || item?.notes || (item?.move ? `Teaches ${item.move}.` : "") || item?.type || "No item description listed.";
  }

  function renderTeamMoveSummary(moveName) {
    const move = moveByName.get(moveName);
    if (!move) return '<div class="team-move-summary is-empty">No move selected.</div>';
    return `
      <div class="team-move-summary">
        <div class="team-move-meta">
          ${typePill(move.type)}
          <span class="chip">${text(effectiveCategory(move))}</span>
          <span class="chip">Power ${value(move.power)}</span>
          <span class="chip">Acc ${value(move.accuracy)}</span>
        </div>
        <p>${text(moveDescription(move))}</p>
      </div>
    `;
  }

  function renderTeamStats(entry, natureName) {
    const nature = naturesByName.get(natureName);
    const natureText = nature?.up && nature?.down ? `${nature.name}: +${statName(nature.up)} / -${statName(nature.down)}` : nature?.name || "No nature set";
    return `
      <section class="team-stat-panel">
        <header><h4>Stats</h4><span class="chip">${text(natureText)}</span></header>
        <div class="team-stat-bars">${teamStatBars(entry.stats, nature)}</div>
      </section>
    `;
  }

  function teamStatBars(stats, nature) {
    return statLabels
      .map(([key, label]) => {
        const base = Number(stats[key] || 0);
        const modifier = natureModifier(nature, key);
        const adjusted = Math.floor(base * modifier);
        const width = Math.min(100, Math.round((adjusted / 180) * 100));
        const changeClass = modifier > 1 ? "is-boosted" : modifier < 1 ? "is-lowered" : "";
        const marker = modifier > 1 ? "+" : modifier < 1 ? "-" : "";
        return `
          <div class="team-stat-line ${changeClass}">
            <strong>${label}</strong>
            <span>${value(base)}</span>
            <span class="team-stat-adjusted">${marker}${value(adjusted)}</span>
            <div class="bar"><span style="--w:${width}%"></span></div>
          </div>
        `;
      })
      .join("");
  }

  function renderEvolutionControls(entry, index, mode = "team") {
    const evolutions = (entry.evolutions || []).filter((evolution) => speciesByName.has(evolution.to));
    if (!evolutions.length) return "";
    const dataName = mode === "planner" ? "data-evolve-planner" : "data-evolve-team";
    return `
      <section class="slot-evolution">
        <span>Evolution</span>
        <div class="evolve-options">
          ${evolutions
            .map((evolution) => {
              const target = speciesByName.get(evolution.to);
              return `
                <button class="evolve-button" type="button" ${dataName}="${index}" data-evolve-to="${attr(target.name)}">
                  ${miniSprite(target)}
                  <span><strong>Evolve to ${text(target.name)}</strong><small>${text(evolutionSummary(evolution))}</small></span>
                </button>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function evolutionSummary(evolution) {
    const method = String(evolution.method || "").trim();
    const requirement = evolution.requirement === null || typeof evolution.requirement === "undefined" ? "" : String(evolution.requirement).trim();
    const conditions = String(evolution.conditions || "").trim();
    const lowerMethod = normalize(method);
    const lowerConditions = normalize(conditions);
    let primary = method || "Evolution";
    if (lowerMethod === "level" && requirement) primary = `Level ${requirement}`;
    else if (lowerMethod === "item" && requirement) primary = `Use ${formatEvolutionRequirement(requirement)}`;
    else if (requirement && !normalize(primary).includes(normalize(requirement))) primary = `${primary}: ${formatEvolutionRequirement(requirement)}`;
    const extra = conditions && lowerConditions !== lowerMethod && lowerConditions !== normalize(requirement) ? conditions : "";
    return joinParts([primary, extra]) || "Next evolution";
  }

  function formatEvolutionRequirement(value) {
    const cleaned = String(value || "")
      .replace(/^ITEM[_\s-]*/i, "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return "";
    return cleaned
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace(/\bHp\b/g, "HP");
  }

  function evolveTeamSlot(index, targetName) {
    const slot = state.team[index];
    const target = speciesByName.get(targetName);
    if (!slot || !target) return;
    const availableMoves = new Set(compatibleMoves(target));
    const availableAbilities = displayAbilities(target).map((ability) => ability.name);
    slot.species = target.name;
    slot.ability = availableAbilities.includes(slot.ability) ? slot.ability : defaultAbility(target);
    slot.moves = slot.moves.map((move) => (availableMoves.has(move) ? move : ""));
    state.caught[target.name] = true;
    persistAndRenderTeam();
    updateCounts();
    invalidateViews(["dex", "locations"]);
    setSaveStatus(`${target.name} evolved and marked caught.`, "success");
  }

  function evolvePlannerSlot(index, targetName) {
    const slot = state.planner[index];
    const target = speciesByName.get(targetName);
    if (!slot || !target) return;
    const availableMoves = new Set(compatibleMoves(target));
    const availableAbilities = displayAbilities(target).map((ability) => ability.name);
    slot.species = target.name;
    slot.ability = availableAbilities.includes(slot.ability) ? slot.ability : defaultAbility(target);
    slot.moves = slot.moves.map((move) => (availableMoves.has(move) ? move : ""));
    persistAndRenderPlanner();
    setSaveStatus(`${target.name} set as the planned evolution.`, "success");
  }

  function renderPlanner() {
    els.plannerGrid.innerHTML = `
      <datalist id="planner-item-list">${data.items.map((item) => `<option value="${attr(item.name)}"></option>`).join("")}</datalist>
      ${renderPlannerProgressSummary()}
      ${state.planner.map((slot, index) => renderPlannerSlot(slot, index)).join("")}
    `;
  }

  function renderPlannerSlot(slot, index) {
    const entry = speciesByName.get(slot.species);
    const moveChoices = entry ? compatibleMoves(entry) : [];
    const item = itemsByName.get(slot.item);
    const abilityOptions = teamAbilityOptions(entry, slot.ability);
    return `
      <article class="slot-card planner-slot-card ${entry ? "type-backed" : ""}"${typeBackdropStyle(entry)}>
        <header>
          <h3>Plan ${index + 1}</h3>
          <button class="small-button" type="button" data-clear-planner="${index}">Clear</button>
        </header>
        ${
          entry
            ? `<div class="slot-preview">${sprite(entry)}<div><strong title="${attr(entry.name)}">${text(slot.nickname || entry.name)}</strong><span class="muted">${text(entry.name)}</span><div class="type-row">${entry.types.map(typePill).join("")}</div></div></div>`
            : '<div class="slot-empty">Search for a Pokemon to plan this endgame slot.</div>'
        }
        <div class="slot-body">
          <div class="team-field-grid">
            <div class="field species-search-field">
              <span>Pokemon</span>
              ${clearableSearchInput({
                value: slot.species,
                placeholder: "Search Pokemon",
                type: "text",
                attributes: `data-planner-species="${index}" autocomplete="off" aria-autocomplete="list" aria-controls="planner-species-suggestions-${index}"`,
              })}
              <div class="species-suggestion-box" id="planner-species-suggestions-${index}" data-planner-species-suggestions="${index}" hidden></div>
            </div>
            <label class="field"><span>Nickname</span><input data-planner-nickname="${index}" value="${attr(slot.nickname || "")}" maxlength="32" placeholder="Optional nickname" /></label>
            <label class="field"><span>Nature</span><select data-planner-nature="${index}">${natureOptions(slot.nature)}</select></label>
            <label class="field"><span>Ability</span><select data-planner-ability="${index}" ${entry ? "" : "disabled"}>${abilityOptions}</select></label>
            <label class="field team-item-field"><span>Held item</span>${clearableSearchInput({
              value: slot.item || "",
              placeholder: "Search held item",
              type: "text",
              attributes: `data-planner-item="${index}" list="planner-item-list" autocomplete="off"`,
            })}</label>
          </div>
          ${renderPlannerItemSummary(item)}
          ${entry ? renderTeamStats(entry, slot.nature) : ""}
          ${entry ? renderAvailability(entry) : '<div class="availability-box muted">Pick a Pokemon to see locations.</div>'}
          <div class="move-grid">
            ${[0, 1, 2, 3]
              .map(
                (moveIndex) => `
                  <div class="move-field">
                    <label class="field"><span>Move ${moveIndex + 1}</span><select data-planner-slot="${index}" data-planner-move="${moveIndex}">
                      ${moveSelect(moveChoices, slot.moves[moveIndex])}
                    </select></label>
                    ${renderTeamMoveSummary(slot.moves[moveIndex])}
                  </div>
                `,
              )
              .join("")}
          </div>
          ${entry ? renderEvolutionControls(entry, index, "planner") : ""}
          <label class="field"><span>Notes</span><textarea data-planner-note="${index}" placeholder="Role, timing, item route, backup plan">${text(slot.note || "")}</textarea></label>
        </div>
      </article>
    `;
  }

  function renderPlannerProgressSummary() {
    const planned = state.planner.filter((slot) => slot.species);
    const caught = planned.filter((slot) => state.caught[slot.species]).length;
    const moves = planned.reduce((total, slot) => total + slot.moves.filter(Boolean).length, 0);
    const items = planned.filter((slot) => slot.item).length;
    return `
      <section class="team-offense-summary planner-progress-summary">
        <header>
          <div>
            <h3>Endgame Team Progress</h3>
            <p class="muted">${planned.length ? `${planned.length} of 6 target Pokemon planned` : "Plan the team you want by the end of the game."}</p>
          </div>
          <span class="chip">${planned.length} / 6 planned</span>
        </header>
        <div class="planner-progress-grid">
          <span class="coverage-type ${planned.length === 6 ? "is-covered" : "is-missing"}" style="--type-color:${typeColors.Normal}"><strong>Species</strong><small>${planned.length} / 6</small></span>
          <span class="coverage-type ${caught === planned.length && planned.length ? "is-covered" : "is-missing"}" style="--type-color:${typeColors.Grass}"><strong>Caught</strong><small>${caught} / ${planned.length || 6}</small></span>
          <span class="coverage-type ${moves >= planned.length * 4 && planned.length ? "is-covered" : "is-missing"}" style="--type-color:${typeColors.Electric}"><strong>Moves</strong><small>${moves} / ${planned.length * 4 || 24}</small></span>
          <span class="coverage-type ${items >= planned.length && planned.length ? "is-covered" : "is-missing"}" style="--type-color:${typeColors.Rock}"><strong>Held items</strong><small>${items} / ${planned.length || 6}</small></span>
        </div>
      </section>
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
    const category = trainer ? trainerCategoryLabel(trainer) : state.battleTrainerCategory || trainerCategories[0] || "";
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
            <small class="muted">${text(trainerCategoryLabel(trainer))}</small>
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
      <div class="trainer-target type-backed"${typeBackdropStyle(entry)}>
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
      <div class="target-summary type-backed"${typeBackdropStyle(entry)}>
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

  function renderSave() {
    const save = makeSaveDocument();
    const backups = getLocalBackups();
    const cloudConfigured = Boolean(syncEndpoint);
    const hasSyncCode = Boolean(syncCode);
    els.savePanel.innerHTML = `
      <article class="save-card">
        <header><h3>Progress Summary</h3><span class="chip">Autosaved</span></header>
        <div class="chip-row">
          <span class="chip">${caughtCount()} caught</span>
          <span class="chip">${obtainedBadgeCount()} badges</span>
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
      <article class="save-card cloud-sync-card">
        <header><h3>Cloud Sync</h3><span class="chip">${cloudConfigured ? "Connected" : "Setup needed"}</span></header>
        <div class="sync-grid">
          <label class="field"><span>Private sync UUID</span><input id="sync-code" class="sync-code-input" value="${attr(syncCode)}" spellcheck="false" placeholder="Create or enter a sync UUID" /></label>
          <p class="sync-service-status" id="sync-service-status" data-connected="${cloudConfigured}"></p>
          <section class="sync-freshness" id="sync-freshness" data-status="${attr(syncStatus)}" aria-live="polite">
            <small>Freshness</small>
            <strong id="sync-freshness-title">Not checked</strong>
            <p id="sync-freshness-detail">Check before moving between devices.</p>
          </section>
          <div class="sync-conflict-actions" id="sync-conflict-actions" hidden>
            <button class="button" id="use-local-save" type="button">Use this device</button>
            <button class="button" id="use-cloud-save" type="button">Use cloud save</button>
          </div>
        </div>
        <div class="save-actions">
          <button class="button" id="create-sync-code" type="button">Create UUID</button>
          <button class="button" id="copy-sync-code" type="button" ${hasSyncCode ? "" : "disabled"}>Copy UUID</button>
          <button class="button" id="check-cloud-save" type="button" ${cloudConfigured && hasSyncCode ? "" : "disabled"}>Check cloud</button>
          <button class="button" id="upload-cloud-save" type="button" ${cloudConfigured && hasSyncCode ? "" : "disabled"}>Save to cloud</button>
          <button class="button" id="download-cloud-save" type="button" ${cloudConfigured && hasSyncCode ? "" : "disabled"}>Load from cloud</button>
          <button class="button" id="forget-sync-code" type="button" ${hasSyncCode ? "" : "disabled"}>Forget UUID</button>
        </div>
      </article>
      <article class="save-card">
        <header><h3>Device Status</h3><span class="chip">Guide ${text(data.meta.version || "1.0")}</span></header>
        <div class="status-grid">
          <div><small>Guide data</small><strong>${text(formatDate(data.meta.generatedAt))}</strong></div>
          <div><small>App shell</small><strong>${text(appShellVersion.replace("heart-soul-field-guide-", ""))}</strong></div>
          <div><small>Save format</small><strong>v${saveVersion}</strong></div>
          <div><small>Local revision</small><strong>${value(save.revision)}</strong></div>
        </div>
        <div class="save-actions">
          <button class="button" id="check-version" type="button">Check latest</button>
        </div>
        <p class="save-status" id="version-check-status" aria-live="polite">This device last loaded guide data from ${text(formatDate(data.meta.generatedAt))}.</p>
      </article>
      <article class="save-card">
        <header><h3>Recovery</h3><span class="chip">${backups.length} backups</span></header>
        <div class="save-actions">
          <button class="button" id="refresh-sync-history" type="button" ${cloudConfigured && hasSyncCode ? "" : "disabled"}>Refresh cloud versions</button>
        </div>
        <div class="sync-recovery-list" id="sync-recovery-list">${renderCloudRecoveryEntries()}</div>
        <div class="backup-list">
          ${backups.length ? backups.map(renderBackupEntry).join("") : empty("No recovery backups yet.")}
        </div>
      </article>
    `;
    updateSyncControls();
  }

  function renderCloudRecoveryEntries() {
    if (!cloudHistory.length) return '<p class="muted">No cloud recovery versions loaded.</p>';
    return cloudHistory
      .map(
        (version) => `
          <div class="backup-entry">
            <div>
              <strong>Cloud revision ${value(version.revision || 0)}</strong>
              <small class="muted">${text(formatDate(version.modifiedAt || version.updatedAt))}</small>
            </div>
            <button class="small-button" type="button" data-restore-cloud="${attr(version.versionId)}">Restore</button>
          </div>
        `,
      )
      .join("");
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

  function initialViewId() {
    const hashView = String(window.location.hash || "").replace(/^#/, "");
    return viewIds.includes(hashView) ? hashView : "dex";
  }

  function renderView(viewId, { force = false } = {}) {
    if (!viewIds.includes(viewId)) return;
    if (!force && renderedViews.has(viewId) && !dirtyViews.has(viewId)) return;

    if (viewId === "dex") renderDex();
    else if (viewId === "locations") renderLocations();
    else if (viewId === "items") renderItems();
    else if (viewId === "moves") renderMoves();
    else if (viewId === "trainers") renderTrainers();
    else if (viewId === "team") renderTeam();
    else if (viewId === "planner") renderPlanner();
    else if (viewId === "battle") renderBattlePlanner();
    else if (viewId === "save") renderSave();

    renderedViews.add(viewId);
    dirtyViews.delete(viewId);
  }

  function invalidateView(viewId, { renderCurrent = true } = {}) {
    if (!viewIds.includes(viewId)) return;
    dirtyViews.add(viewId);
    if (renderCurrent && currentViewId === viewId) renderView(viewId, { force: true });
  }

  function invalidateViews(ids, options) {
    ids.forEach((id) => invalidateView(id, { ...options, renderCurrent: false }));
    if (options?.renderCurrent !== false && ids.includes(currentViewId)) renderView(currentViewId, { force: true });
  }

  function showView(viewId, { scroll = true, replaceHistory = true } = {}) {
    if (!viewId) return;
    if (!els.views.some((view) => view.id === `view-${viewId}`)) viewId = "dex";
    currentViewId = viewId;
    els.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === viewId));
    els.views.forEach((view) => view.classList.toggle("is-active", view.id === `view-${viewId}`));
    renderView(viewId);
    if (replaceHistory) history.replaceState(null, "", `#${viewId}`);
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
    updateJumpTop();
  }

  function updateCounts() {
    renderDashboard();
  }

  function renderDashboard() {
    if (!els.dashboard) return;
    const caught = caughtCount();
    const total = species.length;
    const percent = total ? Math.round((caught / total) * 100) : 0;
    els.dashboard.innerHTML = `
      <button class="overview-panel catch-progress-panel" type="button" data-view-link="dex">
        <div class="overview-panel-head">
          <div>
            <span class="overview-kicker">Dex Catch Progress</span>
            <strong>${value(caught)} / ${value(total)}</strong>
          </div>
          <span class="overview-percent">${value(percent)}%</span>
        </div>
        <span class="progress-track" aria-hidden="true"><span style="width: ${Math.min(100, Math.max(0, percent))}%"></span></span>
        <p>${value(total - caught)} remaining</p>
      </button>
      <section class="overview-panel badge-progress-panel" aria-label="Badge tracker">
        <div class="overview-panel-head">
          <div>
            <span class="overview-kicker">Badge Progress</span>
            <strong>${value(obtainedBadgeCount())} / ${value(badgeDefinitions.length)}</strong>
          </div>
        </div>
        <div class="badge-region-list">
          ${badgeGroups.map(renderBadgeGroup).join("")}
        </div>
      </section>
    `;
  }

  function renderBadgeGroup(group) {
    return `
      <div class="badge-region" data-region="${attr(group.region)}">
        <span>${text(group.region)}</span>
        <div class="badge-row">
          ${group.badges.map(renderBadgeButton).join("")}
        </div>
      </div>
    `;
  }

  function renderBadgeButton(badge) {
    const obtained = Boolean(state.badges?.[badge.id]);
    return `
      <button class="badge-button ${obtained ? "is-obtained" : ""}" type="button" data-badge="${attr(badge.id)}" aria-pressed="${obtained}" title="${attr(`${badge.name} - ${badge.leader}`)}">
        <span class="badge-art">
          <img src="${attr(badgeImagePath(badge))}" alt="" loading="lazy" onerror="this.hidden=true" />
        </span>
        <span class="sr-only">${text(badge.name)}</span>
      </button>
    `;
  }

  function badgeImagePath(badge) {
    return `assets/art/badges/${badge.id}.png`;
  }

  function obtainedBadgeCount() {
    return badgeDefinitions.filter((badge) => state.badges?.[badge.id]).length;
  }

  function addToTeam(name) {
    const slot = state.team.find((entry) => !entry.species);
    if (!slot) {
      showView("team");
      return;
    }
    const entry = speciesByName.get(name);
    const caughtChanged = entry ? maybeMarkCaughtForTeam(entry) : false;
    slot.species = entry ? entry.name : name;
    slot.ability = entry ? defaultAbility(entry) : "";
    slot.moves = ["", "", "", ""];
    persistAndRenderTeam();
    if (caughtChanged) {
      updateCounts();
      invalidateViews(["dex", "locations"]);
    }
    showView("team");
  }

  function maybeMarkCaughtForTeam(entry) {
    if (!entry || state.caught[entry.name]) return false;
    if (!confirm(`${entry.name} is not marked caught yet. Mark it caught in the Dex?`)) return false;
    state.caught[entry.name] = true;
    return true;
  }

  function addToPlanner(name) {
    const slot = state.planner.find((entry) => !entry.species);
    if (!slot) {
      showView("planner");
      return;
    }
    const entry = speciesByName.get(name);
    slot.species = entry?.name || name;
    slot.ability = entry ? defaultAbility(entry) : "";
    slot.moves = ["", "", "", ""];
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
    resetDexLimit();
    renderControls();
    invalidateView("dex", { renderCurrent: false });
    showView("dex");
  }

  function jumpToLocation(name) {
    closeModal();
    filters.locationSearch = name;
    filters.locationExact = name;
    expandedLocations.add(name);
    renderControls();
    invalidateView("locations", { renderCurrent: false });
    showView("locations");
  }

  function jumpToItem(search) {
    closeModal();
    filters.itemSearch = search;
    filters.itemType = "";
    renderControls();
    invalidateView("items", { renderCurrent: false });
    showView("items");
  }

  function jumpToMove(name) {
    closeModal();
    filters.moveSearch = name;
    filters.moveType = "";
    filters.moveCategory = "";
    renderControls();
    invalidateView("moves", { renderCurrent: false });
    showView("moves");
    setMoveSectionsOpen(true);
  }

  function planTrainerBattle(trainerId) {
    const trainer = trainersById.get(trainerId);
    if (!trainer) return;
    state.battleMode = "trainer";
    state.battleTrainerCategory = trainerCategoryLabel(trainer);
    state.battleTrainerId = trainer.id;
    persist();
    invalidateViews(["battle", "save"], { renderCurrent: false });
    showView("battle");
  }

  function trainerCategoryLabel(trainerOrCategory) {
    const category = typeof trainerOrCategory === "string" ? trainerOrCategory : trainerOrCategory?.category || "";
    const normalized = normalize(category);
    return bossCategoryLookup.get(normalized) || titleCaseCategory(category);
  }

  function titleCaseCategory(category) {
    return String(category || "")
      .replace(/[_-]+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function firstTrainerForCategory(category) {
    return data.trainers.find((trainer) => trainerCategoryLabel(trainer) === category) || data.trainers[0] || null;
  }

  function trainersForCategory(category) {
    return data.trainers.filter((trainer) => trainerCategoryLabel(trainer) === category);
  }

  function selectedBattleTrainer() {
    return trainersById.get(state.battleTrainerId) || null;
  }

  function ensureSelectedTrainer() {
    if (!trainerCategories.includes(state.battleTrainerCategory)) {
      state.battleTrainerCategory = trainerCategories[0] || "";
    }
    const current = selectedBattleTrainer();
    if (!current || trainerCategoryLabel(current) !== state.battleTrainerCategory) {
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
    renderTeamOverview();
    invalidateViews(["team", "battle", "save"]);
  }

  function persistAndRenderPlanner() {
    persist();
    invalidateViews(["planner", "save"]);
  }

  function rerenderStateful() {
    document.documentElement.dataset.theme = state.theme;
    renderThemeToggle();
    updateCounts();
    renderControls();
    renderRules();
    renderTeamOverview();
    invalidateViews(viewIds);
  }

  function makeSaveDocument({ parentRevision = syncContext.lastSyncedRevision } = {}) {
    return {
      format: saveFormat,
      app: "heart-soul-field-guide",
      version: saveVersion,
      revision: state.revision,
      exportedAt: new Date().toISOString(),
      sync: {
        revision: Math.max(1, state.revision),
        parentRevision,
        modifiedAt: state.updatedAt,
        deviceId,
      },
      state,
    };
  }

  function validateSaveDocument(input) {
    return normalizeSaveDocument(input).state;
  }

  function normalizeSaveDocument(input) {
    if (!input || typeof input !== "object") throw new Error("This save file is empty or invalid.");
    if (input.format && (input.format !== saveFormat || input.version !== saveVersion)) {
      throw new Error("This is not a supported Heart & Soul Field Guide save.");
    }
    if (input.app && input.app !== "heart-soul-field-guide") {
      throw new Error("This save belongs to a different guide.");
    }
    const nextState = sanitizeState(input.state || input);
    const syncInput = input.sync || {};
    const revision = Number.isInteger(syncInput.revision) && syncInput.revision >= 1 ? syncInput.revision : Math.max(1, nextState.revision);
    return {
      format: saveFormat,
      app: "heart-soul-field-guide",
      version: saveVersion,
      revision: nextState.revision,
      exportedAt: typeof input.exportedAt === "string" ? input.exportedAt : new Date().toISOString(),
      sync: {
        revision,
        parentRevision:
          syncInput.parentRevision === null || (Number.isInteger(syncInput.parentRevision) && syncInput.parentRevision >= 0)
            ? syncInput.parentRevision
            : null,
        modifiedAt: typeof syncInput.modifiedAt === "string" ? syncInput.modifiedAt : nextState.updatedAt,
        deviceId: uuidPattern.test(syncInput.deviceId || "") ? syncInput.deviceId : deviceId,
      },
      state: nextState,
    };
  }

  function applySaveDocument(input, { source = "import", createBackup = true } = {}) {
    const next = validateSaveDocument(input);
    if (createBackup) {
      const reason =
        source === "cloud"
          ? "Before cloud sync load"
          : source === "cloud-recovery"
            ? "Before cloud recovery restore"
            : source === "backup"
              ? "Before recovery restore"
              : "Before import";
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

  function createSyncCode() {
    try {
      syncCode = makeUuid();
      localStorage.setItem(syncCodeKey, syncCode);
      ensureSyncContext(syncCode);
      syncSnapshot = null;
      cloudHistory = [];
      renderSave();
      setSaveStatus("New private sync UUID created. Keep it somewhere safe.", "success");
    } catch (error) {
      setSaveStatus(error.message || "Could not create a sync UUID.", "error");
    }
  }

  async function copySyncCode() {
    try {
      const code = normalizedSyncCode();
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is not available in this browser.");
      await navigator.clipboard.writeText(code);
      setSaveStatus("Sync UUID copied.", "success");
    } catch (error) {
      setSaveStatus(error.message || "Could not copy the sync UUID.", "error");
    }
  }

  function forgetSyncCode() {
    syncCode = "";
    syncContext = emptySyncContext();
    syncSnapshot = null;
    syncStatus = "unchecked";
    cloudHistory = [];
    localStorage.removeItem(syncCodeKey);
    localStorage.removeItem(syncContextKey);
    renderSave();
    setSaveStatus("This device forgot the sync UUID. The encrypted cloud save was not deleted.", "success");
  }

  function normalizedSyncCode() {
    const code = (document.querySelector("#sync-code")?.value || syncCode || "").trim().toLowerCase();
    if (!uuidPattern.test(code)) throw new Error("Enter a valid sync UUID, or create a new one.");
    if (!cloudCryptoAvailable()) throw new Error("Encrypted cloud sync is not available in this browser.");
    syncCode = code;
    localStorage.setItem(syncCodeKey, code);
    ensureSyncContext(code);
    return code;
  }

  function cloudCryptoAvailable() {
    return Boolean(window.crypto?.subtle && window.crypto?.getRandomValues && window.TextEncoder && window.TextDecoder);
  }

  function updateSyncControls() {
    const input = document.querySelector("#sync-code");
    if (!input) return;
    const configured = Boolean(syncEndpoint);
    const hasCode = Boolean(syncCode);
    input.value = syncCode;
    setDisabled("#check-cloud-save", !configured || !hasCode);
    setDisabled("#upload-cloud-save", !configured || !hasCode);
    setDisabled("#download-cloud-save", !configured || !hasCode);
    setDisabled("#refresh-sync-history", !configured || !hasCode);
    setDisabled("#copy-sync-code", !hasCode);
    setDisabled("#forget-sync-code", !hasCode);
    const service = document.querySelector("#sync-service-status");
    if (service) {
      service.textContent = configured
        ? "Cloud sync service connected. Saves are encrypted before upload."
        : "Cloud sync is not connected yet. Export and import work now; deploy the Cloudflare Worker to enable it.";
      service.dataset.connected = String(configured);
    }
    if (!configured || !hasCode) setSyncFreshness("unchecked");
    else setSyncFreshness(syncStatus, syncSnapshot);
  }

  function setDisabled(selector, disabled) {
    const element = document.querySelector(selector);
    if (element) element.disabled = disabled;
  }

  function emptySyncContext() {
    return { code: "", lastSyncedRevision: null, lastSyncedFingerprint: "", lastSyncedAt: null };
  }

  function loadSyncContext() {
    const stored = readStoredJson(syncContextKey, {});
    return {
      code: typeof stored.code === "string" ? stored.code : "",
      lastSyncedRevision:
        Number.isInteger(stored.lastSyncedRevision) && stored.lastSyncedRevision >= 0 ? stored.lastSyncedRevision : null,
      lastSyncedFingerprint: typeof stored.lastSyncedFingerprint === "string" ? stored.lastSyncedFingerprint : "",
      lastSyncedAt: typeof stored.lastSyncedAt === "string" ? stored.lastSyncedAt : null,
    };
  }

  function ensureSyncContext(code) {
    if (syncContext.code === code) return;
    syncContext = { ...emptySyncContext(), code };
    persistSyncContext();
  }

  function persistSyncContext() {
    try {
      localStorage.setItem(syncContextKey, JSON.stringify(syncContext));
    } catch (error) {
      console.warn("Could not save sync context.", error);
    }
  }

  function setSyncFreshness(status, snapshot = syncSnapshot) {
    syncStatus = status || "unchecked";
    const panel = document.querySelector("#sync-freshness");
    if (!panel) return;
    const cloudDate = snapshot?.cloudSave?.sync?.modifiedAt || snapshot?.envelope?.updatedAt;
    const messages = {
      unchecked: ["Not checked", "Check before moving between devices."],
      checking: ["Checking...", "Comparing this device with the encrypted cloud save."],
      "no-cloud": ["No cloud save yet", "This device can create the first encrypted cloud revision."],
      "in-sync": ["In sync", `Both copies match. Last cloud change: ${formatDate(cloudDate)}.`],
      "local-newer": ["This device is newer", "Local changes have not been uploaded yet."],
      "cloud-newer": ["Cloud save is newer", `Load the cloud copy from ${formatDate(cloudDate)} before continuing here.`],
      conflict: ["Changes on both copies", "Choose which copy to keep. Your current device will be backed up first."],
      error: ["Could not check", "Your local save has not been changed."],
    };
    const [title, detail] = messages[syncStatus] || messages.unchecked;
    panel.dataset.status = syncStatus;
    const titleElement = document.querySelector("#sync-freshness-title");
    const detailElement = document.querySelector("#sync-freshness-detail");
    const conflictActions = document.querySelector("#sync-conflict-actions");
    if (titleElement) titleElement.textContent = title;
    if (detailElement) detailElement.textContent = detail;
    if (conflictActions) conflictActions.hidden = !["cloud-newer", "conflict"].includes(syncStatus);
  }

  async function fetchCloudSnapshot(code = normalizedSyncCode()) {
    if (!syncEndpoint) throw new Error("Cloud sync is not connected yet.");
    const { id } = await syncIdentity(code);
    const response = await fetch(`${syncEndpoint}/saves/${id}`);
    if (response.status === 404) return { id, envelope: null, cloudSave: null };
    if (!response.ok) throw new Error("The encrypted cloud save could not be downloaded.");
    const envelope = await response.json();
    return { id, envelope, cloudSave: await decryptSave(envelope, code) };
  }

  async function checkSyncStatus() {
    setSyncFreshness("checking");
    try {
      const code = normalizedSyncCode();
      const remote = await fetchCloudSnapshot(code);
      const localSave = makeSaveDocument();
      const localFingerprint = await saveFingerprint(localSave);
      const cloudFingerprint = remote.cloudSave ? await saveFingerprint(remote.cloudSave) : "";
      const status = classifySyncStatus({
        localSave,
        cloudSave: remote.cloudSave,
        localFingerprint,
        cloudFingerprint,
        context: syncContext,
      });
      syncSnapshot = { ...remote, localSave, localFingerprint, cloudFingerprint };
      if (status === "in-sync" && remote.cloudSave) recordSyncBaseline(code, remote.cloudSave, cloudFingerprint);
      setSyncFreshness(status, syncSnapshot);
      return syncSnapshot;
    } catch (error) {
      setSyncFreshness("error");
      throw error;
    }
  }

  async function uploadCurrentSave({ force = false } = {}) {
    const code = normalizedSyncCode();
    const snapshot = await checkSyncStatus();
    if (["cloud-newer", "conflict"].includes(syncStatus) && !force) {
      setSaveStatus("Cloud changes were found. Choose which copy to keep; nothing was overwritten.", "error");
      return false;
    }
    if (syncStatus === "in-sync" && !force) {
      setSaveStatus("This device already matches the cloud save.", "success");
      return true;
    }
    const cloudRevision = snapshot.cloudSave?.sync?.revision || 0;
    if (state.revision <= cloudRevision || state.revision < 1) advanceLocalRevision(cloudRevision);
    const save = makeSaveDocument({ parentRevision: snapshot.cloudSave ? cloudRevision : null });
    const fingerprint = await saveFingerprint(save);
    const { id, envelope } = await encryptSave(save, code);
    const response = await fetch(`${syncEndpoint}/saves/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });
    if (response.status === 409) {
      await checkSyncStatus();
      setSaveStatus("The cloud save changed during upload. Choose which copy to keep; nothing was overwritten.", "error");
      return false;
    }
    if (!response.ok) throw new Error("The encrypted save could not be uploaded.");
    recordSyncBaseline(code, save, fingerprint);
    syncSnapshot = { id, envelope, cloudSave: save, localSave: save, localFingerprint: fingerprint, cloudFingerprint: fingerprint };
    setSyncFreshness("in-sync", syncSnapshot);
    renderSave();
    setSaveStatus("Encrypted save uploaded. This device and cloud are now in sync.", "success");
    return true;
  }

  async function loadCloudSave({ force = false } = {}) {
    const code = normalizedSyncCode();
    const snapshot = await checkSyncStatus();
    if (!snapshot.cloudSave) throw new Error("No cloud save exists for this UUID yet.");
    if (syncStatus === "in-sync" && !force) {
      setSaveStatus("This device already matches the cloud save.", "success");
      return true;
    }
    if (["local-newer", "conflict"].includes(syncStatus) && !force) {
      setSaveStatus("This device also has changes. Choose which copy to keep; nothing was overwritten.", "error");
      setSyncFreshness(syncStatus, snapshot);
      return false;
    }
    applySaveDocument(snapshot.cloudSave, { source: "cloud" });
    recordSyncBaseline(code, snapshot.cloudSave, snapshot.cloudFingerprint);
    syncSnapshot = { ...snapshot, localSave: snapshot.cloudSave, localFingerprint: snapshot.cloudFingerprint };
    setSyncFreshness("in-sync", syncSnapshot);
    setSaveStatus("Cloud save loaded. The previous local copy is available under Recovery.", "success");
    return true;
  }

  async function loadCloudHistory() {
    const code = normalizedSyncCode();
    const { id } = await syncIdentity(code);
    const response = await fetch(`${syncEndpoint}/saves/${id}/history`);
    if (!response.ok) throw new Error("Cloud recovery versions could not be loaded.");
    cloudHistory = (await response.json()).versions || [];
    renderSave();
    setSaveStatus("Cloud recovery versions refreshed.", "success");
  }

  async function restoreCloudVersion(versionId) {
    const code = normalizedSyncCode();
    const { id } = await syncIdentity(code);
    const response = await fetch(`${syncEndpoint}/saves/${id}/history/${encodeURIComponent(versionId)}`);
    if (!response.ok) throw new Error("That cloud recovery version is no longer available.");
    const save = await decryptSave(await response.json(), code);
    if (!confirm(`Restore cloud revision ${save.sync.revision} to this device? The current local save will be backed up first.`)) return;
    applySaveDocument(save, { source: "cloud-recovery" });
    syncSnapshot = null;
    setSyncFreshness("local-newer");
    setSaveStatus("Cloud recovery version restored locally. Review it, then save it to cloud when ready.", "success");
  }

  function recordSyncBaseline(code, save, fingerprint) {
    syncContext = {
      code,
      lastSyncedRevision: save.sync.revision,
      lastSyncedFingerprint: fingerprint,
      lastSyncedAt: new Date().toISOString(),
    };
    persistSyncContext();
  }

  function classifySyncStatus({ localSave, cloudSave, localFingerprint, cloudFingerprint, context }) {
    if (!cloudSave) return "no-cloud";
    if (localFingerprint === cloudFingerprint) return "in-sync";
    if (!context.lastSyncedFingerprint) return isPristineSave(localSave) ? "cloud-newer" : "conflict";
    const localChanged = localFingerprint !== context.lastSyncedFingerprint;
    const cloudChanged = cloudFingerprint !== context.lastSyncedFingerprint;
    if (localChanged && cloudChanged) return "conflict";
    if (cloudChanged) return "cloud-newer";
    if (localChanged) return "local-newer";
    return "in-sync";
  }

  function saveFingerprintPayload(save) {
    const next = normalizeSaveDocument(save).state;
    return {
      theme: next.theme,
      rules: next.rules,
      caught: Object.keys(next.caught).filter((name) => next.caught[name]).sort(),
      team: next.team,
      planner: next.planner,
      battleMode: next.battleMode,
      battleTrainerCategory: next.battleTrainerCategory,
      battleTrainerId: next.battleTrainerId,
      battleTargets: next.battleTargets,
    };
  }

  async function saveFingerprint(save) {
    const bytes = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(saveFingerprintPayload(save)))),
    );
    return bytesToHex(bytes);
  }

  function isPristineSave(save) {
    const payload = saveFingerprintPayload(save);
    return (
      !payload.caught.length &&
      payload.team.every((slot) => !slot.species) &&
      payload.planner.every((slot) => !slot.species && !slot.note) &&
      payload.battleMode === "custom" &&
      payload.battleTargets.every((target) => !target)
    );
  }

  async function encryptSave(save, code) {
    const { id, key } = await syncIdentity(code);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(save))),
    );
    return {
      id,
      envelope: {
        version: 2,
        iv: bytesToBase64Url(iv),
        ciphertext: bytesToBase64Url(ciphertext),
        updatedAt: new Date().toISOString(),
        revision: save.sync.revision,
        parentRevision: save.sync.parentRevision,
        modifiedAt: save.sync.modifiedAt || new Date().toISOString(),
        deviceId: save.sync.deviceId,
      },
    };
  }

  async function decryptSave(envelope, code) {
    if (![1, 2].includes(envelope?.version) || !envelope.iv || !envelope.ciphertext) {
      throw new Error("The cloud save has an unsupported encrypted format.");
    }
    const { key } = await syncIdentity(code);
    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64UrlToBytes(envelope.iv) },
        key,
        base64UrlToBytes(envelope.ciphertext),
      );
      return normalizeSaveDocument(JSON.parse(new TextDecoder().decode(plaintext)));
    } catch {
      throw new Error("The sync UUID could not decrypt this cloud save.");
    }
  }

  async function syncIdentity(code) {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`heart-soul:${code}`)));
    return {
      id: bytesToHex(digest),
      key: await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]),
    };
  }

  function bytesToBase64Url(bytes) {
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64UrlToBytes(value) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  }

  function bytesToHex(bytes) {
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function checkLatestVersion() {
    setVersionStatus("Checking published guide files...", "");
    try {
      if (!window.fetch) throw new Error("Version checks are not available in this browser.");
      const stamp = Date.now();
      const [dataText, shellText] = await Promise.all([
        fetch(`data/heart-soul-data.js?check=${stamp}`, { cache: "no-store" }).then(readVersionResponse),
        fetch(`sw.js?check=${stamp}`, { cache: "no-store" }).then(readVersionResponse),
      ]);
      const latestData = parseGuideDataScript(dataText);
      const latestShell = shellText.match(/CACHE_NAME\s*=\s*"([^"]+)"/)?.[1] || "";
      const dataMatches = latestData?.meta?.generatedAt === data.meta.generatedAt;
      const shellMatches = latestShell === appShellVersion;
      if (dataMatches && shellMatches) {
        setVersionStatus("This device is using the latest published guide files.", "success");
      } else {
        setVersionStatus("A newer guide version is published. Reload this page on this device, then create a fresh sync code.", "error");
      }
    } catch (error) {
      setVersionStatus(error.message || "Could not check the published guide version.", "error");
    }
  }

  async function readVersionResponse(response) {
    if (!response.ok) throw new Error("Could not reach the published guide files.");
    return response.text();
  }

  function parseGuideDataScript(scriptText) {
    const match = scriptText.match(/window\.HEART_SOUL_DATA\s*=\s*(\{[\s\S]*\});?\s*$/);
    if (!match) throw new Error("Published guide data could not be read.");
    return JSON.parse(match[1]);
  }

  function setVersionStatus(message, status) {
    const target = document.querySelector("#version-check-status");
    if (!target) return;
    target.textContent = message;
    target.dataset.status = status || "";
  }

  function readStoredJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadDeviceId() {
    const stored = localStorage.getItem(syncDeviceKey) || "";
    if (uuidPattern.test(stored)) return stored;
    const next = makeUuid();
    try {
      localStorage.setItem(syncDeviceKey, next);
    } catch (error) {
      console.warn("Could not save sync device ID.", error);
    }
    return next;
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

  function makeUuid() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (window.crypto?.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      bytes.forEach((_, index) => {
        bytes[index] = Math.floor(Math.random() * 256);
      });
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytesToHex(bytes);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
      if (syncCode && syncEndpoint && syncStatus === "in-sync") {
        syncSnapshot = null;
        syncStatus = "local-newer";
      }
    } catch (error) {
      console.warn("Could not save local guide state.", error);
      setSaveStatus("Local storage is full or unavailable.", "error");
    }
  }

  function advanceLocalRevision(minimumRevision = 0) {
    state.revision = Math.max(state.revision, minimumRevision) + 1;
    state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(saveKey, JSON.stringify(state));
    } catch (error) {
      console.warn("Could not save local guide state.", error);
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
    const inputBattleCategory = trainerCategoryLabel(input.battleTrainerCategory);
    let battleTrainerCategory = trainerCategories.includes(inputBattleCategory) ? inputBattleCategory : fresh.battleTrainerCategory;
    let battleTrainerId = typeof input.battleTrainerId === "string" && trainersById.has(input.battleTrainerId) ? input.battleTrainerId : "";
    const trainer = trainersById.get(battleTrainerId);
    if (trainer && trainerCategoryLabel(trainer) !== battleTrainerCategory) battleTrainerId = "";
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
      badges: sanitizeBadges(input.badges),
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
      badges: {},
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

  function sanitizeBadges(input) {
    const badges = {};
    if (!input || typeof input !== "object") return badges;
    Object.entries(input).forEach(([id, value]) => {
      if (value && badgeIds.has(id)) badges[id] = true;
    });
    return badges;
  }

  function sanitizeSlots(input, factory) {
    return Array.from({ length: 6 }, (_, index) => {
      const raw = Array.isArray(input) ? input[index] : null;
      const slot = factory();
      if (!raw || typeof raw !== "object") return slot;
      if (speciesByName.has(raw.species)) slot.species = raw.species;
      if ("ability" in slot) slot.ability = typeof raw.ability === "string" ? raw.ability : "";
      if ("nickname" in slot) slot.nickname = cleanTeamNickname(raw.nickname);
      if ("nature" in slot) slot.nature = naturesByName.has(raw.nature) ? raw.nature : "";
      if ("item" in slot) slot.item = itemsByName.has(raw.item) ? raw.item : "";
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
    return { species: "", ability: "", moves: ["", "", "", ""], nature: "", item: "", nickname: "" };
  }

  function blankPlannerSlot() {
    return { species: "", ability: "", moves: ["", "", "", ""], nature: "", item: "", nickname: "", note: "" };
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

  function cleanTeamNickname(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, 32);
  }

  function statName(key) {
    return statLabels.find(([statKey]) => statKey === key)?.[1] || key;
  }

  function natureModifier(nature, statKey) {
    if (!nature) return 1;
    if (nature.up === statKey) return 1.1;
    if (nature.down === statKey) return 0.9;
    return 1;
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

  function primaryType(entry) {
    return entry?.types?.[0] || "";
  }

  function typeBackdropStyle(entry) {
    const type = primaryType(entry);
    const background = typeBackgrounds[type];
    if (!background) return "";
    const color = typeColors[type] || typeColors.Mystery;
    return ` style="--type-bg:url('${background}'); --type-color:${color}"`;
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

  function slugify(value) {
    return normalize(value).replace(/\s+/g, "_");
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

import fs from "node:fs";
import { webcrypto } from "node:crypto";
import vm from "node:vm";

const dataScript = fs.readFileSync("data/heart-soul-data.js", "utf8");
const appScript = fs.readFileSync("app.js", "utf8");
const styleSheet = fs.readFileSync("styles.css", "utf8");
const indexHtml = fs.readFileSync("index.html", "utf8");
const saveKey = "heart-soul-field-guide-save-v1";

class FakeClassList {
  add() {}
  remove() {}
  toggle() {}
}

class FakeElement {
  constructor(selector = "") {
    this.selector = selector;
    this.dataset = {};
    this.style = { setProperty() {} };
    this.classList = new FakeClassList();
    this.children = [];
    this.hidden = false;
    this.value = "";
    this.checked = false;
    this.textContent = "";
    this.innerHTML = "";
    this.attributes = {};
  }

  addEventListener() {}
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
  querySelector() {
    return new FakeElement();
  }
  querySelectorAll() {
    return [];
  }
  closest() {
    return null;
  }
  append(...children) {
    this.children.push(...children);
  }
  remove() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 40, height: 40 };
  }
}

function runApp(savedState = null, options = {}) {
  const selectors = new Map();
  const listeners = {};
  const elementFor = (selector) => {
    if (!selectors.has(selector)) selectors.set(selector, new FakeElement(selector));
    return selectors.get(selector);
  };

  const tabElements = Array.from({ length: 10 }, (_, index) => {
    const element = new FakeElement(".tab");
    element.dataset.view = ["dex", "locations", "legendaries", "items", "moves", "trainers", "team", "planner", "battle", "save"][index];
    return element;
  });
  const viewElements = tabElements.map((tab) => {
    const element = new FakeElement(".view");
    element.id = `view-${tab.dataset.view}`;
    return element;
  });

  const document = {
    body: elementFor("body"),
    documentElement: elementFor("html"),
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    querySelector(selector) {
      return elementFor(selector);
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    querySelectorAll(selector) {
      if (selector === "[data-view]") return tabElements;
      if (selector === ".view") return viewElements;
      return [];
    },
  };

  const storage = new Map();
  if (savedState) storage.set(saveKey, JSON.stringify(savedState));
  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
  };

  const context = {
    window: {},
    document,
    localStorage,
    location: { hash: "" },
    history: { replaceState() {} },
    scrollTo() {},
    confirm: () => true,
    alert(message) {
      throw new Error(message);
    },
    Blob,
    URL,
    console,
    setTimeout,
  };
  if (options.crypto) {
    Object.assign(context, {
      crypto: webcrypto,
      TextEncoder,
      TextDecoder,
      btoa(value) {
        return Buffer.from(value, "binary").toString("base64");
      },
      atob(value) {
        return Buffer.from(value, "base64").toString("binary");
      },
      encodeURIComponent,
      decodeURIComponent,
      navigator: { clipboard: { writeText: async () => {} } },
    });
  }
  context.window = context;

  vm.createContext(context);
  vm.runInContext(dataScript, context, { filename: "data/heart-soul-data.js" });
  vm.runInContext(appScript, context, { filename: "app.js" });
  return {
    context,
    elementFor,
    click(selector) {
      listeners.click?.({
        preventDefault() {},
        target: {
          closest(query) {
            return query
              .split(",")
              .map((part) => part.trim())
              .includes(selector)
              ? elementFor(selector)
              : null;
          },
        },
      });
    },
  };
}

const defaultApp = runApp();
const data = defaultApp.context.HEART_SOUL_DATA;
const firstTrainer = data.trainers[0];
const bossState = {
  theme: "light",
  revision: 1,
  updatedAt: "2026-07-01T00:00:00.000Z",
  rules: { fairy: true, physicalSplit: true },
  caught: {},
  team: Array.from({ length: 6 }, (_, index) =>
    index === 0
      ? { species: "Bulbasaur", ability: "Overgrow", moves: ["Tackle", "Vine Whip", "", ""], nature: "Adamant", item: "Fire Stone", nickname: "Sprout" }
      : { species: "", ability: "", moves: ["", "", "", ""], nature: "", item: "", nickname: "" },
  ),
  planner: Array.from({ length: 6 }, () => ({ species: "", note: "" })),
  battleMode: "trainer",
  battleTrainerCategory: firstTrainer.category,
  battleTrainerId: firstTrainer.id,
  battleTargets: ["", ""],
};
const bossApp = runApp(bossState);
function renderViews(app, viewIds) {
  viewIds.forEach((viewId) => {
    app.elementFor("[data-view]").dataset.view = viewId;
    app.click("[data-view]");
  });
}
renderViews(defaultApp, ["locations", "items", "moves", "trainers", "team", "planner", "battle", "save", "dex"]);
renderViews(bossApp, ["team", "battle"]);
const speciesModalApp = runApp();
speciesModalApp.elementFor("[data-open-species]").dataset.openSpecies = "Bulbasaur";
speciesModalApp.click("[data-open-species]");
defaultApp.elementFor("[data-open-moves]").dataset.openMoves = "Bulbasaur";
defaultApp.click("[data-open-moves]");
const syncApp = runApp(null, { crypto: true });
syncApp.click("#create-sync-code");
await new Promise((resolve) => setTimeout(resolve, 100));
const badgeApp = runApp();
badgeApp.elementFor("[data-badge]").dataset.badge = "zephyr";
badgeApp.click("[data-badge]");
const legendaryApp = runApp();
legendaryApp.elementFor("[data-view]").dataset.view = "legendaries";
legendaryApp.click("[data-view]");
const legendaryCaughtApp = runApp();
legendaryCaughtApp.elementFor("[data-view]").dataset.view = "legendaries";
legendaryCaughtApp.click("[data-view]");
legendaryCaughtApp.elementFor("[data-caught]").dataset.caught = "Ho Oh";
legendaryCaughtApp.click("[data-caught]");
legendaryCaughtApp.click("[data-legendary-hide-caught]");
const teamSaveApp = runApp(bossState);
teamSaveApp.elementFor("[data-view]").dataset.view = "team";
teamSaveApp.click("[data-view]");
teamSaveApp.click("#save-current-team");
const savedTeamState = JSON.parse(teamSaveApp.context.localStorage.getItem(saveKey) || "{}");

function appearsInOrder(haystack, needles) {
  let cursor = -1;
  return needles.every((needle) => {
    const index = haystack.indexOf(needle, cursor + 1);
    if (index === -1) return false;
    cursor = index;
    return true;
  });
}

const checks = {
  dashboardRendered:
    defaultApp.elementFor("#dashboard").innerHTML.includes("Dex Catch Progress") &&
    defaultApp.elementFor("#dashboard").innerHTML.includes("Badge Progress") &&
    defaultApp.elementFor("#dashboard").innerHTML.includes("progress-track") &&
    defaultApp.elementFor("#dashboard").innerHTML.includes('data-badge="zephyr"') &&
    defaultApp.elementFor("#dashboard").innerHTML.includes("assets/art/badges/zephyr.png"),
  badgeToggleRendered:
    badgeApp.elementFor("#dashboard").innerHTML.includes("1 / 16") &&
    badgeApp.elementFor("#dashboard").innerHTML.includes("is-obtained"),
  dexCardsRendered: defaultApp.elementFor("#dex-grid").innerHTML.includes("Bulbasaur"),
  dexInitialCardCount: (defaultApp.elementFor("#dex-grid").innerHTML.match(/data-species-card=/g) || []).length,
  dexSortControlRendered: defaultApp.elementFor("#dex-controls").innerHTML.includes("id=\"dex-sort\"") && defaultApp.elementFor("#dex-controls").innerHTML.includes("Sp. Atk"),
  dexCardsHaveMovesButton: defaultApp.elementFor("#dex-grid").innerHTML.includes("data-open-moves"),
  dexCardsHaveAbilityButtons: defaultApp.elementFor("#dex-grid").innerHTML.includes("ability-button") && defaultApp.elementFor("#dex-grid").innerHTML.includes("Powers up Grass moves"),
  dexCardsDoNotUseDetailsPane: !defaultApp.elementFor("#dex-grid").innerHTML.includes('class="pokemon-card-details"'),
  dexCardsDoNotUseProfileBlocks: !defaultApp.elementFor("#dex-grid").innerHTML.includes("Profile"),
  dexCardsHideNoneAbilities: !defaultApp.elementFor("#dex-grid").innerHTML.includes(">None</span>"),
  locationsHaveClickableSpriteEncounters:
    defaultApp.elementFor("#location-list").innerHTML.includes("data-open-species") &&
    defaultApp.elementFor("#location-list").innerHTML.includes("encounter-link") &&
    defaultApp.elementFor("#location-list").innerHTML.includes("mini-sprite"),
  locationsGroupedByTime:
    defaultApp.elementFor("#location-list").innerHTML.includes("location-time-section") &&
    defaultApp.elementFor("#location-list").innerHTML.includes("location-method"),
  locationQuickFiltersSorted: appearsInOrder(defaultApp.elementFor("#location-controls").innerHTML, [
    'data-location-filter="">All Locations',
    'data-location-filter="Route 1"',
    'data-location-filter="Route 2"',
    'data-location-filter="Route 10"',
    'data-location-filter="Burned Tower 1F"',
  ]),
  legendaryTabRendered:
    indexHtml.includes('data-view="legendaries"') &&
    indexHtml.includes("assets/items/s_s_ticket.png") &&
    legendaryApp.elementFor("#legendary-controls").innerHTML.includes('data-legendary-filter="ho-oh"') &&
    legendaryApp.elementFor("#legendary-controls").innerHTML.includes("assets/pokemon/mewtwo.png") &&
    legendaryApp.elementFor("#legendary-controls").innerHTML.includes("data-legendary-hide-caught"),
  legendaryGuidesRendered:
    (legendaryApp.elementFor("#legendary-list").innerHTML.match(/data-legendary-section=/g) || []).length === 17 &&
    legendaryApp.elementFor("#legendary-list").innerHTML.includes("Old Sea Map") &&
    legendaryApp.elementFor("#legendary-list").innerHTML.includes("Move left 4, face down, and press A.") &&
    legendaryApp.elementFor("#legendary-list").innerHTML.includes("Base stats") &&
    legendaryApp.elementFor("#legendary-list").innerHTML.includes('data-caught="Ho Oh"') &&
    legendaryApp.elementFor("#legendary-list").innerHTML.includes('data-open-moves="Mewtwo"') &&
    !legendaryApp.elementFor("#legendary-list").innerHTML.includes('data-legendary-section="ho-oh" open'),
  legendaryHideCaught:
    (legendaryCaughtApp.elementFor("#legendary-list").innerHTML.match(/data-legendary-section=/g) || []).length === 16 &&
    legendaryCaughtApp.elementFor("#legendary-controls").innerHTML.includes("legendary-filter-caught-badge") &&
    legendaryCaughtApp.elementFor("#legendary-count").textContent === "Showing 16 of 17",
  speciesModalRendered:
    speciesModalApp.elementFor("#modal-root").innerHTML.includes("data-species-modal=\"Bulbasaur\"") &&
    speciesModalApp.elementFor("#modal-root").innerHTML.includes("Mark caught") &&
    speciesModalApp.elementFor("#modal-root").innerHTML.includes("Powers up Grass moves"),
  itemIconsRendered: defaultApp.elementFor("#item-table").innerHTML.includes("item-icon") && defaultApp.elementFor("#item-table").innerHTML.includes("assets/items/fire_stone.png"),
  itemDescriptionsRendered:
    defaultApp.elementFor("#item-table").innerHTML.includes("Description") &&
    defaultApp.elementFor("#item-table").innerHTML.includes("Makes certain species of Pokemon evolve."),
  movesModalRendered:
    defaultApp.elementFor("#modal-root").innerHTML.includes("Bulbasaur Moves") &&
    defaultApp.elementFor("#modal-root").innerHTML.includes("Vine Whip") &&
    defaultApp.elementFor("#modal-root").innerHTML.includes("data-jump-item") &&
    defaultApp.elementFor("#modal-root").innerHTML.includes("Strikes the foe with slender, whiplike vines."),
  movesTabHasTutorSection:
    defaultApp.elementFor("#move-table").innerHTML.includes("Tutor moves") &&
    defaultApp.elementFor("#move-table").innerHTML.includes("Description") &&
    defaultApp.elementFor("#move-table").innerHTML.includes("Draws the foe close, then strikes without fail.") &&
    defaultApp.elementFor("#move-table").innerHTML.includes("Requirement") &&
    defaultApp.elementFor("#move-table").innerHTML.includes("data-move-sections=\"expand\"") &&
    defaultApp.elementFor("#move-table").innerHTML.includes("section-count") &&
    !defaultApp.elementFor("#move-table").innerHTML.includes("Protect Affected"),
  movesTabTutorRowsPlain: !defaultApp.elementFor("#move-table").innerHTML.includes("data-jump-move"),
  trainerPlanButtonsRendered: defaultApp.elementFor("#trainer-list").innerHTML.includes("Plan this trainer"),
  bossBattleLabelsRendered:
    indexHtml.includes(">Boss Battles</span>") &&
    defaultApp.elementFor("#trainer-controls").innerHTML.includes("Johto Gym Leaders") &&
    defaultApp.elementFor("#trainer-controls").innerHTML.includes("Johto League") &&
    !defaultApp.elementFor("#trainer-controls").innerHTML.includes("JOHTO GYM LEADERS"),
  trainerSpritesRendered: defaultApp.elementFor("#trainer-list").innerHTML.includes("trainer-avatar") && defaultApp.elementFor("#trainer-list").innerHTML.includes("mini-sprite"),
  trainerMoveTooltipsRendered:
    defaultApp.elementFor("#trainer-list").innerHTML.includes("move-tooltip") &&
    defaultApp.elementFor("#trainer-list").innerHTML.includes("Power") &&
    defaultApp.elementFor("#trainer-list").innerHTML.includes("trainer-held-item") &&
    styleSheet.includes(".trainer-move-list"),
  teamSlotsRendered: (defaultApp.elementFor("#team-grid").innerHTML.match(/Slot /g) || []).length,
  teamBuilderEnhanced:
    defaultApp.elementFor("#team-grid").innerHTML.includes("data-team-species-suggestions") &&
    defaultApp.elementFor("#team-grid").innerHTML.includes("aria-autocomplete=\"list\"") &&
    defaultApp.elementFor("#team-grid").innerHTML.includes("list=\"team-item-list\"") &&
    defaultApp.elementFor("#team-grid").innerHTML.includes("Nickname") &&
    defaultApp.elementFor("#team-grid").innerHTML.includes("Held item") &&
    defaultApp.elementFor("#team-grid").innerHTML.includes("Nature") &&
    defaultApp.elementFor("#team-grid").innerHTML.includes("Saved Teams") &&
    defaultApp.elementFor("#team-grid").innerHTML.includes("save-current-team"),
  teamLocalSaves:
    Array.isArray(savedTeamState.savedTeams) &&
    savedTeamState.savedTeams.length === 1 &&
    savedTeamState.savedTeams[0].team[0].species === "Bulbasaur" &&
    savedTeamState.savedTeams[0].team[0].moves.includes("Vine Whip") &&
    teamSaveApp.elementFor("#team-grid").innerHTML.includes("data-load-saved-team") &&
    teamSaveApp.elementFor("#team-grid").innerHTML.includes("Sprout"),
  teamBuilderDetails:
    bossApp.elementFor("#team-grid").innerHTML.includes("Offensive Coverage") &&
    bossApp.elementFor("#team-grid").innerHTML.includes("Grass") &&
    bossApp.elementFor("#team-grid").innerHTML.includes("Missing") &&
    bossApp.elementFor("#team-grid").innerHTML.includes("Level 16") &&
    bossApp.elementFor("#team-grid").innerHTML.includes("Power") &&
    bossApp.elementFor("#team-grid").innerHTML.includes("Acc") &&
    bossApp.elementFor("#team-grid").innerHTML.includes("Fire Stone") &&
    bossApp.elementFor("#team-grid").innerHTML.includes("Makes certain species of Pokemon evolve.") &&
    bossApp.elementFor("#team-grid").innerHTML.includes("Charges the foe with a full-body tackle.") &&
    bossApp.elementFor("#team-grid").innerHTML.includes("Strikes the foe with slender, whiplike vines.") &&
    bossApp.elementFor("#team-grid").innerHTML.includes("data-team-item-summary") &&
    !bossApp.elementFor("#team-grid").innerHTML.includes("Found:") &&
    !bossApp.elementFor("#team-grid").innerHTML.includes("Protect Affected") &&
    !bossApp.elementFor("#team-grid").innerHTML.includes(">Ability</option>"),
  teamOverviewRendered: defaultApp.elementFor("#team-overview").innerHTML.includes("team-overview-slot"),
  plannerEnhanced:
    defaultApp.elementFor("#planner-grid").innerHTML.includes("Endgame Team Progress") &&
    defaultApp.elementFor("#planner-grid").innerHTML.includes("data-planner-species-suggestions") &&
    defaultApp.elementFor("#planner-grid").innerHTML.includes("aria-autocomplete=\"list\"") &&
    defaultApp.elementFor("#planner-grid").innerHTML.includes("data-planner-move") &&
    defaultApp.elementFor("#planner-grid").innerHTML.includes("data-planner-item"),
  typeBackgroundsRendered:
    defaultApp.elementFor("#dex-grid").innerHTML.includes("assets/type-backgrounds/grass.jpg") &&
    defaultApp.elementFor("#location-list").innerHTML.includes("type-backed") &&
    bossApp.elementFor("#team-overview").innerHTML.includes("assets/type-backgrounds/grass.jpg") &&
    bossApp.elementFor("#team-grid").innerHTML.includes("assets/type-backgrounds/grass.jpg"),
  headerBannerRendered:
    styleSheet.includes("assets/art/heart-soul-banner.png") &&
    styleSheet.includes(".theme-toggle") &&
    indexHtml.includes("assets/nav/rule_book.png") &&
    indexHtml.includes("assets/nav/bag.png") &&
    indexHtml.includes("assets/nav/card_key.png") &&
    indexHtml.includes(">Field Guide</span>") &&
    defaultApp.elementFor("#theme-toggle").dataset.themeState === "light" &&
    defaultApp.elementFor("#theme-toggle").getAttribute("aria-label") === "Switch to dark mode",
  customFontRendered:
    styleSheet.includes("@font-face") &&
    styleSheet.includes("assets/fonts/atlantis-international.ttf") &&
    styleSheet.includes(".item-data-table td") &&
    styleSheet.includes(".move-data-table td") &&
    styleSheet.includes("--font-display") &&
    styleSheet.includes("--font-readable"),
  teamRulesRemoved: !defaultApp.elementFor("#rules-panel").innerHTML.includes("Fairy type") && !defaultApp.elementFor("#rules-panel").innerHTML.includes("physical/special split"),
  customBattlePlannerRendered: defaultApp.elementFor("#battle-targets").innerHTML.includes("Custom targets"),
  bossBattlePlannerRendered: bossApp.elementFor("#battle-targets").innerHTML.includes("Boss battle") && bossApp.elementFor("#battle-targets").innerHTML.includes(firstTrainer.name),
  bossBattleResultsRendered: bossApp.elementFor("#battle-results").innerHTML.includes("Offensive Answers") && bossApp.elementFor("#battle-results").innerHTML.includes("Defensive Threats"),
  saveRendered:
    defaultApp.elementFor("#save-panel").innerHTML.includes("Export save") &&
    defaultApp.elementFor("#save-panel").innerHTML.includes("Cloud Sync") &&
    defaultApp.elementFor("#save-panel").innerHTML.includes("Private sync UUID") &&
    defaultApp.elementFor("#save-panel").innerHTML.includes("Device Status") &&
    defaultApp.elementFor("#save-panel").innerHTML.includes("Check latest") &&
    !defaultApp.elementFor("#save-panel").innerHTML.includes("Passphrase") &&
    defaultApp.elementFor("#save-panel").innerHTML.includes("Recovery"),
  syncCodeCreated: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(syncApp.elementFor("#sync-code").value),
};

console.log(JSON.stringify(checks, null, 2));

if (
  !checks.dashboardRendered ||
  !checks.badgeToggleRendered ||
  !checks.dexCardsRendered ||
  checks.dexInitialCardCount !== 50 ||
  !checks.dexSortControlRendered ||
  !checks.dexCardsHaveMovesButton ||
  !checks.dexCardsHaveAbilityButtons ||
  !checks.dexCardsDoNotUseDetailsPane ||
  !checks.dexCardsDoNotUseProfileBlocks ||
  !checks.dexCardsHideNoneAbilities ||
  !checks.locationsHaveClickableSpriteEncounters ||
  !checks.locationsGroupedByTime ||
  !checks.locationQuickFiltersSorted ||
  !checks.legendaryTabRendered ||
  !checks.legendaryGuidesRendered ||
  !checks.legendaryHideCaught ||
  !checks.speciesModalRendered ||
  !checks.itemIconsRendered ||
  !checks.itemDescriptionsRendered ||
  !checks.movesModalRendered ||
  !checks.movesTabHasTutorSection ||
  !checks.movesTabTutorRowsPlain ||
  !checks.trainerPlanButtonsRendered ||
  !checks.bossBattleLabelsRendered ||
  !checks.trainerSpritesRendered ||
  !checks.trainerMoveTooltipsRendered ||
  checks.teamSlotsRendered !== 6 ||
  !checks.teamBuilderEnhanced ||
  !checks.teamLocalSaves ||
  !checks.teamBuilderDetails ||
  !checks.teamOverviewRendered ||
  !checks.plannerEnhanced ||
  !checks.typeBackgroundsRendered ||
  !checks.headerBannerRendered ||
  !checks.customFontRendered ||
  !checks.teamRulesRemoved ||
  !checks.customBattlePlannerRendered ||
  !checks.bossBattlePlannerRendered ||
  !checks.bossBattleResultsRendered ||
  !checks.saveRendered ||
  !checks.syncCodeCreated
) {
  process.exit(1);
}

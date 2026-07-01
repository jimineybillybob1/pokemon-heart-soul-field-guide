import fs from "node:fs";
import { webcrypto } from "node:crypto";
import vm from "node:vm";

const dataScript = fs.readFileSync("data/heart-soul-data.js", "utf8");
const appScript = fs.readFileSync("app.js", "utf8");
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
    this.style = {};
    this.classList = new FakeClassList();
    this.children = [];
    this.hidden = false;
    this.value = "";
    this.checked = false;
    this.textContent = "";
    this.innerHTML = "";
  }

  addEventListener() {}
  querySelector() {
    return new FakeElement();
  }
  querySelectorAll() {
    return [];
  }
  closest() {
    return null;
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
    element.dataset.view = ["dex", "locations", "items", "moves", "trainers", "team", "planner", "battle", "more", "save"][index];
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
    history: { replaceState() {} },
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
    index === 0 ? { species: "Bulbasaur", ability: "Overgrow", moves: ["Tackle", "Vine Whip", "", ""] } : { species: "", ability: "", moves: ["", "", "", ""] },
  ),
  planner: Array.from({ length: 6 }, () => ({ species: "", note: "" })),
  battleMode: "trainer",
  battleTrainerCategory: firstTrainer.category,
  battleTrainerId: firstTrainer.id,
  battleTargets: ["", ""],
};
const bossApp = runApp(bossState);
defaultApp.elementFor("[data-open-moves]").dataset.openMoves = "Bulbasaur";
defaultApp.click("[data-open-moves]");
const syncApp = runApp(null, { crypto: true });
syncApp.elementFor("#sync-passphrase").value = "heart-soul-test";
syncApp.click("#create-sync-code");
await new Promise((resolve) => setTimeout(resolve, 100));

const checks = {
  speciesStat: defaultApp.elementFor("#stat-species").textContent,
  locationStat: defaultApp.elementFor("#stat-locations").textContent,
  dexCardsRendered: defaultApp.elementFor("#dex-grid").innerHTML.includes("Bulbasaur"),
  dexCardsHaveMovesButton: defaultApp.elementFor("#dex-grid").innerHTML.includes("data-open-moves"),
  dexCardsDoNotUseDetailsPane: !defaultApp.elementFor("#dex-grid").innerHTML.includes("<details"),
  movesModalRendered:
    defaultApp.elementFor("#modal-root").innerHTML.includes("Bulbasaur Moves") &&
    defaultApp.elementFor("#modal-root").innerHTML.includes("Vine Whip") &&
    defaultApp.elementFor("#modal-root").innerHTML.includes("data-jump-item"),
  trainerPlanButtonsRendered: defaultApp.elementFor("#trainer-list").innerHTML.includes("Plan this trainer"),
  teamSlotsRendered: (defaultApp.elementFor("#team-grid").innerHTML.match(/Slot /g) || []).length,
  customBattlePlannerRendered: defaultApp.elementFor("#battle-targets").innerHTML.includes("Custom targets"),
  bossBattlePlannerRendered: bossApp.elementFor("#battle-targets").innerHTML.includes("Boss battle") && bossApp.elementFor("#battle-targets").innerHTML.includes(firstTrainer.name),
  bossBattleResultsRendered: bossApp.elementFor("#battle-results").innerHTML.includes("Offensive Answers") && bossApp.elementFor("#battle-results").innerHTML.includes("Defensive Threats"),
  saveRendered:
    defaultApp.elementFor("#save-panel").innerHTML.includes("Export save") &&
    defaultApp.elementFor("#save-panel").innerHTML.includes("Encrypted Sync") &&
    defaultApp.elementFor("#save-panel").innerHTML.includes("Recovery"),
  syncCodeCreated: syncApp.elementFor("#sync-code").value.startsWith("HNS1."),
};

console.log(JSON.stringify(checks, null, 2));

if (
  String(checks.speciesStat) !== "423" ||
  String(checks.locationStat) !== "144" ||
  !checks.dexCardsRendered ||
  !checks.dexCardsHaveMovesButton ||
  !checks.dexCardsDoNotUseDetailsPane ||
  !checks.movesModalRendered ||
  !checks.trainerPlanButtonsRendered ||
  checks.teamSlotsRendered !== 6 ||
  !checks.customBattlePlannerRendered ||
  !checks.bossBattlePlannerRendered ||
  !checks.bossBattleResultsRendered ||
  !checks.saveRendered ||
  !checks.syncCodeCreated
) {
  process.exit(1);
}

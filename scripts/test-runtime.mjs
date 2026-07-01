import fs from "node:fs";
import vm from "node:vm";

const dataScript = fs.readFileSync("data/heart-soul-data.js", "utf8");
const appScript = fs.readFileSync("app.js", "utf8");

class FakeClassList {
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

const selectors = new Map();
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
  addEventListener() {},
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
};
context.window = context;

vm.createContext(context);
vm.runInContext(dataScript, context, { filename: "data/heart-soul-data.js" });
vm.runInContext(appScript, context, { filename: "app.js" });

const checks = {
  speciesStat: elementFor("#stat-species").textContent,
  locationStat: elementFor("#stat-locations").textContent,
  dexCardsRendered: elementFor("#dex-grid").innerHTML.includes("Bulbasaur"),
  teamSlotsRendered: (elementFor("#team-grid").innerHTML.match(/Slot /g) || []).length,
  saveRendered: elementFor("#save-panel").innerHTML.includes("Export save"),
};

console.log(JSON.stringify(checks, null, 2));

if (
  String(checks.speciesStat) !== "423" ||
  String(checks.locationStat) !== "144" ||
  !checks.dexCardsRendered ||
  checks.teamSlotsRendered !== 6 ||
  !checks.saveRendered
) {
  process.exit(1);
}

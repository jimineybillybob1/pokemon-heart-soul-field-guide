import { fileURLToPath, pathToFileURL } from "node:url";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch (error) {
  console.log(`Skipping browser smoke test: ${error.message}`);
  process.exit(0);
}

const root = new URL("../", import.meta.url);
const indexUrl = pathToFileURL(fileURLToPath(new URL("index.html", root))).href;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(indexUrl);
await page.waitForLoadState("load");

const initial = await page.evaluate(() => ({
  title: document.title,
  cards: document.querySelectorAll(".pokemon-card").length,
  tabs: document.querySelectorAll(".tab").length,
  firstCard: document.querySelector(".pokemon-card h3")?.textContent,
  speciesStat: document.querySelector("#stat-species")?.textContent,
}));

await page.fill("#dex-search", "Mareep");
const searchCount = await page.locator(".pokemon-card").count();
await page.click("[data-caught=\"Mareep\"]");
const caughtStat = await page.textContent("#stat-caught");

await page.click("[data-view=\"team\"]");
const teamSlots = await page.locator("#team-grid .slot-card").count();
await page.selectOption("[data-team-species=\"0\"]", "Mareep");
const selectedTeam = await page.locator("#team-grid .slot-card").first().textContent();

await page.click("[data-view=\"locations\"]");
const locationVisible = await page.locator("#view-locations.is-active").count();

await page.click("[data-view=\"legendaries\"]");
const legendaryVisible = await page.locator("#view-legendaries.is-active").count();
const legendaryCards = await page.locator(".legendary-card").count();
const legendaryInitiallyOpen = await page.locator(".legendary-card[open]").count();
const legendaryFilterSprites = await page.locator(".legendary-filter-button img").count();
await page.click("[data-legendary-filter=\"ho-oh\"]");
const filteredLegendaryCards = await page.locator(".legendary-card").count();
const filteredLegendaryOpen = await page.locator(".legendary-card[open]").count();
const legendaryDetailsVisible =
  (await page.locator("[data-legendary-section=\"ho-oh\"] .legendary-pokemon-details").count()) === 1 &&
  (await page.locator("[data-legendary-section=\"ho-oh\"] .stat-line").count()) === 6 &&
  (await page.locator("[data-legendary-section=\"ho-oh\"] [data-open-moves=\"Ho Oh\"]").count()) === 1;
await page.click("[data-legendary-section=\"ho-oh\"] [data-caught=\"Ho Oh\"]");
const legendaryCaught = await page.textContent("[data-legendary-section=\"ho-oh\"] [data-caught=\"Ho Oh\"]");
const legendaryStayedOpen = await page.locator("[data-legendary-section=\"ho-oh\"][open]").count();
await page.click("[data-legendary-filter=\"\"]");
await page.click("[data-legendary-sections=\"collapse\"]");
const legendaryCollapsed = await page.locator(".legendary-card[open]").count();
await page.click("[data-legendary-sections=\"expand\"]");
const legendaryExpanded = await page.locator(".legendary-card[open]").count();

await browser.close();

const result = {
  initial,
  searchCount,
  caughtStat,
  teamSlots,
  selectedTeamHasMareep: selectedTeam.includes("Mareep"),
  locationVisible,
  legendaryVisible,
  legendaryCards,
  legendaryInitiallyOpen,
  legendaryFilterSprites,
  filteredLegendaryCards,
  filteredLegendaryOpen,
  legendaryDetailsVisible,
  legendaryCaught,
  legendaryStayedOpen,
  legendaryCollapsed,
  legendaryExpanded,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (
  initial.title !== "Pokemon Heart & Soul Field Guide" ||
  initial.cards < 400 ||
  initial.tabs < 8 ||
  searchCount < 1 ||
  caughtStat !== "1" ||
  teamSlots !== 6 ||
  !result.selectedTeamHasMareep ||
  locationVisible !== 1 ||
  legendaryVisible !== 1 ||
  legendaryCards !== 17 ||
  legendaryInitiallyOpen !== 0 ||
  legendaryFilterSprites !== 18 ||
  filteredLegendaryCards !== 1 ||
  filteredLegendaryOpen !== 1 ||
  !legendaryDetailsVisible ||
  legendaryCaught?.trim() !== "Caught" ||
  legendaryStayedOpen !== 1 ||
  legendaryCollapsed !== 0 ||
  legendaryExpanded !== 17 ||
  errors.length
) {
  process.exit(1);
}

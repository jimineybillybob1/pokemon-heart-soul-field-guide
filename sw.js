const CACHE_NAME = "heart-soul-field-guide-v22";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./sync-config.js",
  "./site.webmanifest",
  "./data/heart-soul-data.js",
  "./assets/fonts/atlantis-international.ttf",
  "./assets/fonts/atlantis-international-info.txt",
  "./assets/art/heart-soul-logo.png",
  "./assets/art/heart-soul-banner.png",
  "./assets/art/heart-soul-title.png",
  "./assets/art/badges/zephyr.png",
  "./assets/art/badges/hive.png",
  "./assets/art/badges/plain.png",
  "./assets/art/badges/fog.png",
  "./assets/art/badges/storm.png",
  "./assets/art/badges/mineral.png",
  "./assets/art/badges/glacier.png",
  "./assets/art/badges/rising.png",
  "./assets/art/badges/boulder.png",
  "./assets/art/badges/cascade.png",
  "./assets/art/badges/thunder.png",
  "./assets/art/badges/rainbow.png",
  "./assets/art/badges/soul.png",
  "./assets/art/badges/marsh.png",
  "./assets/art/badges/volcano.png",
  "./assets/art/badges/earth.png",
  "./assets/nav/rule_book.png",
  "./assets/nav/town_map.png",
  "./assets/nav/bag.png",
  "./assets/nav/tm_case.png",
  "./assets/nav/vs_seeker.png",
  "./assets/nav/poke_ball.png",
  "./assets/nav/master_ball.png",
  "./assets/nav/question_mark.png",
  "./assets/nav/card_key.png",
  "./assets/type-backgrounds/grass.jpg",
  "./assets/type-backgrounds/fire.jpg",
  "./assets/type-backgrounds/water.jpg",
  "./assets/type-backgrounds/electric.jpg",
  "./assets/type-backgrounds/ice.jpg",
  "./assets/type-backgrounds/fighting.jpg",
  "./assets/type-backgrounds/poison.jpg",
  "./assets/type-backgrounds/ground.jpg",
  "./assets/type-backgrounds/flying.jpg",
  "./assets/type-backgrounds/psychic.jpg",
  "./assets/type-backgrounds/bug.jpg",
  "./assets/type-backgrounds/rock.jpg",
  "./assets/type-backgrounds/ghost.jpg",
  "./assets/type-backgrounds/dragon.jpg",
  "./assets/type-backgrounds/steel.jpg",
  "./assets/type-backgrounds/dark.jpg",
  "./assets/type-backgrounds/fairy.jpg",
  "./assets/type-backgrounds/normal.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    }),
  );
});

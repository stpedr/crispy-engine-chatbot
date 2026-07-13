export const pwaManifest = JSON.stringify({
  name: "Sales Bot",
  short_name: "Sales Bot",
  description: "Atendimento comercial, qualificacao de leads e recomendacao de produtos.",
  start_url: "./",
  scope: "./",
  display: "standalone",
  background_color: "#f6f7f4",
  theme_color: "#18211d",
  lang: "pt-BR",
  orientation: "any",
  icons: [
    {
      src: "./icon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any maskable"
    }
  ]
});

export const pwaIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="88" fill="#18211d"/>
  <path d="M128 138h256v54H128zm0 91h188v54H128zm0 91h256v54H128z" fill="#ffffff"/>
  <circle cx="360" cy="256" r="54" fill="#d96845"/>
  <path d="m338 256 16 16 31-34" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const serviceWorker = String.raw`const CACHE_NAME = "sales-bot-pwa-v1";
const APP_SHELL = ["./", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./")))
  );
});`;

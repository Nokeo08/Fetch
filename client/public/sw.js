const VERSION = "__BUILD_HASH__";
const CACHE_NAME = "fetch-" + VERSION;
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/manifest.json",
    "/favicon.ico",
    "/banner.png",
    "/icons/icon-48.png",
    "/icons/icon-72.png",
    "/icons/icon-96.png",
    "/icons/icon-128.png",
    "/icons/icon-144.png",
    "/icons/icon-152.png",
    "/icons/icon-180.png",
    "/icons/icon-192.png",
    "/icons/icon-384.png",
    "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }),
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name)),
            );
        }),
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    const url = new URL(event.request.url);

    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(
                    JSON.stringify({ success: false, error: "Offline" }),
                    {
                        status: 503,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }),
        );
        return;
    }

    if (url.pathname.startsWith("/ws")) {
        return;
    }

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match("/index.html").then((cached) => {
                        return cached || new Response("Offline", { status: 503 });
                    });
                }),
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            return fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return new Response("Offline", { status: 503 });
                });
        }),
    );
});

self.addEventListener("sync", (event) => {
    if (event.tag === "fetch-sync") {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
        client.postMessage({ type: "SYNC_TRIGGERED" });
    });
}

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

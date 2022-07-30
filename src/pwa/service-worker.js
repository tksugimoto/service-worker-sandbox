const CACHE_VERSION = '2022/07/31-16:00';
const CACHE_NAME_SEPARATOR = ' '; // path 中の 半角スペース は url encode されるため混同される可能性がない
const CACHE_NAME = `${self.registration.scope}${CACHE_NAME_SEPARATOR}${CACHE_VERSION}`;

const urlsToCache = [
	'./',
	'./index.html',
	'./share_target.html',
];

self.addEventListener('install', event => {
	console.log(self.registration.scope, CACHE_VERSION, 'install', event);
	const promise = Promise.all([
		caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)),
		self.skipWaiting(),
	]);
	event.waitUntil(promise);
});

self.addEventListener('activate', event => {
	console.log(self.registration.scope, CACHE_VERSION, 'activate', event);
	const cacheDeletionPromise = caches.keys().then(cacheNames => {
		console.log(self.registration.scope, CACHE_VERSION, 'cacheNames', cacheNames);
		const cachesToDelete = cacheNames.filter(cacheName => {
			const [scope, version] = cacheName.split(CACHE_NAME_SEPARATOR);
			return scope === self.registration.scope && version !== CACHE_VERSION;
		});
		console.log(self.registration.scope, CACHE_VERSION, 'cachesToDelete', cachesToDelete);
		const promises = cachesToDelete.map(cacheName => caches.delete(cacheName));
		return Promise.all(promises);
	});
	event.waitUntil(Promise.all([
		cacheDeletionPromise,
		self.clients.claim(),
	]));
});

self.addEventListener('fetch', event => {
	console.log(self.registration.scope, CACHE_VERSION, 'fetch', event.request.url, event);
	const responsePromise = caches.open(CACHE_NAME).then(cache => {
		return cache.match(event.request, {
			ignoreSearch: true,
		}).then(cacheResponse => {
			if (cacheResponse) {
				console.log(self.registration.scope, CACHE_VERSION, 'caches.match', event.request.url, cacheResponse);
				return cacheResponse;
			}

			return fetch(event.request).then(response => {
				if (response.ok) {
					cache.put(event.request, response.clone());
				}
				return response;
			});
		});
	});
	event.respondWith(responsePromise);
});

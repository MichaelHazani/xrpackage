const hijackedClientIds = {};
const hijackedIds = {};
const startUrls = {};
self.addEventListener('message', e => {
  const {
    data
  } = e;
  // console.log('service worker got message', data);
  const {
    method
  } = data;
  if (method === 'hijack') {
    const {
      id,
      startUrl,
      files
    } = data;
    console.log('got hijack', data);
    hijackedIds[id] = files;
    startUrls[startUrl] = true;
  } else {
    console.warn('unknown method', method);
  }
  /* const {method} = data;
  if (method === 'redirect') {
    const {src, dst} = data;
    let redirectsArray = redirects[src];
    if (!redirectsArray) {
      redirectsArray = [];
      redirects[src] = redirectsArray;
    }
    redirectsArray.push(dst);
  } */
  e.ports[0].postMessage({});
});
self.addEventListener('install', event => {
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  console.log('got fetch', event, {hijackedClientIds, hijackedIds, startUrls});
  const {
    clientId,
  } = event;
  event.respondWith(
    clients.get(clientId)
    .then(client => {
      const u = new URL(event.request.url);
      let {pathname} = u;
      let pathnameChanged = false;
      // console.log('got client', event.request.url, !!(client && client.frameType === 'nested'));
      if (client && client.frameType === 'nested') {
        // console.log('got client', u.pathname, client, event.request);
        if (event.request.method === 'POST' && pathname === '/xrpackage/registerClient') {
          return event.request.json()
            .then(j => {
              const {id} = j;
              // console.log('got client hijack', clientId, id);
              hijackedClientIds[clientId] = id;
            })
            .then(() =>
              new Response(JSON.stringify({
                ok: true,
              }))
            );
        } else {
          const id = hijackedClientIds[clientId];
          if (id) {
            const files = hijackedIds[id];
            // console.log('hijack file 2', client.url, files);
            if (files) {
              // console.log('hijack file 2', pathname, files);
              if (!/\/xrpackage\//.test(pathname)) {
                const file = files.find(f => f.pathname === pathname);
                if (file) {
                  return new Response(file.body);
                }
              }
            }
          }
        }
      }
      if (startUrls[pathname.slice(1)]) {
        pathname = '/xrpackage/iframe.html';
        pathnameChanged = true;
      }
      if (/\/xrpackage\//.test(pathname)) {
        const {hostname} = new URL(client ? client.url : event.request.referrer);
        if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
          pathname = 'https://xrpackage.org' + pathname;
          pathnameChanged = true;
        }
      }
      return pathnameChanged ? fetch(pathname) : fetch(event.request);
    })
  );
});
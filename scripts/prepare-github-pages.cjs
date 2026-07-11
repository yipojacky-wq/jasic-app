const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const indexPath = path.join(distDir, 'index.html');
const assetsDir = path.join(projectRoot, 'assets');

if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html not found. Run npm run build:web first.');
}

let html = fs.readFileSync(indexPath, 'utf8');

html = html
  .replaceAll('href="/favicon.ico"', 'href="./favicon.ico"')
  .replaceAll('src="/_expo/', 'src="./_expo/')
  .replaceAll('href="/_expo/', 'href="./_expo/');

const pwaHead = [
  '<link rel="manifest" href="./manifest.webmanifest" />',
  '<link rel="apple-touch-icon" href="./apple-touch-icon.png" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="JASIC" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
].join('\n');

if (!html.includes('manifest.webmanifest')) {
  html = html.replace('</head>', `${pwaHead}\n</head>`);
}

const serviceWorkerRegistration = [
  '<script>',
  "if ('serviceWorker' in navigator) {",
  "  window.addEventListener('load', function () {",
  "    navigator.serviceWorker.register('./service-worker.js').catch(function (error) {",
  "      console.warn('JASIC service worker registration failed', error);",
  '    });',
  '  });',
  '}',
  '</script>',
].join('\n');

if (!html.includes('service-worker.js')) {
  html = html.replace('</body>', `${serviceWorkerRegistration}\n</body>`);
}

fs.writeFileSync(indexPath, html);
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

const iconSource = path.join(assetsDir, 'icon.png');
if (fs.existsSync(iconSource)) {
  fs.copyFileSync(iconSource, path.join(distDir, 'pwa-icon.png'));
  fs.copyFileSync(iconSource, path.join(distDir, 'apple-touch-icon.png'));
}

const manifest = {
  name: 'JASIC Stock Intelligence',
  short_name: 'JASIC',
  description:
    'JASIC stock intelligence dashboard, discovery funnel, AI check and risk reports.',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F3F6FA',
  theme_color: '#0B1220',
  icons: [
    {
      src: './pwa-icon.png',
      sizes: '1024x1024',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
};

fs.writeFileSync(
  path.join(distDir, 'manifest.webmanifest'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

const serviceWorker = `
const CACHE_NAME = 'jasic-pwa-shell-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.ico',
  './pwa-icon.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
`.trimStart();

fs.writeFileSync(path.join(distDir, 'service-worker.js'), serviceWorker);

console.log('Prepared dist/ for GitHub Pages.');
console.log('- Rewrote root asset paths to relative paths.');
console.log('- Added dist/.nojekyll so GitHub Pages serves _expo assets.');
console.log('- Added PWA manifest, icons and service worker.');

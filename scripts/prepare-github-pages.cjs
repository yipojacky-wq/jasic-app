const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html not found. Run npm run build:web first.');
}

let html = fs.readFileSync(indexPath, 'utf8');

html = html
  .replaceAll('href="/favicon.ico"', 'href="./favicon.ico"')
  .replaceAll('src="/_expo/', 'src="./_expo/')
  .replaceAll('href="/_expo/', 'href="./_expo/');

fs.writeFileSync(indexPath, html);
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

console.log('Prepared dist/ for GitHub Pages.');
console.log('- Rewrote root asset paths to relative paths.');
console.log('- Added dist/.nojekyll so GitHub Pages serves _expo assets.');

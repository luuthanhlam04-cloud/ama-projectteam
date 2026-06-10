const fs = require('fs');
const img = fs.readFileSync('c:/Users/luuth/ama-projectteam/frontend/public/icon-192x192.png');
const b64 = img.toString('base64');
let html = fs.readFileSync('c:/Users/luuth/ama-projectteam/frontend/index.html', 'utf8');
html = html.replace(/href="\/icon-192x192\.png"/g, 'href="data:image/png;base64,' + b64 + '"');
fs.writeFileSync('c:/Users/luuth/ama-projectteam/frontend/index.html', html);
console.log('Done');

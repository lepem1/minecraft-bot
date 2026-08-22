const express = require('express');
const http = require('http');

function createFullscreenViewer(config, viewer) {
  const app = express();
  app.get('/', (req, res) => res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,iframe{margin:0;width:100%;height:100%;overflow:hidden;background:#000}#status,#full{position:fixed;z-index:2;color:#fff;background:#000a;border:0;padding:10px}#status{top:0;left:0}#full{top:0;right:0}</style></head><body><span id="status">POV connecting</span><button id="full">Fullscreen</button><iframe id="pov" src="/pov/"></iframe><script>const f=document.getElementById('pov');f.onload=()=>document.getElementById('status').textContent='POV connected';f.onerror=()=>document.getElementById('status').textContent='POV unavailable';document.getElementById('full').onclick=()=>document.documentElement.requestFullscreen?.();</script></body></html>`));
  app.use((req, res, next) => { if (req.url === '/pov' || req.url.startsWith('/pov/')) return viewer.proxyRequest(req, res); next(); });
  const server = http.createServer(app);
  server.on('upgrade', (req, socket, head) => { if (req.url.startsWith('/pov/')) viewer.proxyUpgrade(req, socket, head); else socket.destroy(); });
  return server;
}
module.exports = createFullscreenViewer;

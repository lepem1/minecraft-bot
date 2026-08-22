const express = require('express');
function createRoutes(config, botManager) {
  const router = express.Router();
  const requireAuth = (req, res, next) => { if (!config.web.password || req.headers['x-dashboard-password'] === config.web.password) return next(); res.status(401).json({ error: 'Dashboard password required.' }); };
  router.get('/health', (req, res) => res.json({ ok: true }));
  router.get('/api/status', (req, res) => res.json({ state: botManager.state, status: require('../bot/status').buildStatus(botManager.state, botManager.bot) }));
  router.get('/api/config', (req, res) => res.json({ minecraftHost: config.minecraft.host, minecraftPort: config.minecraft.port, minecraftVersion: config.minecraft.version, botUsername: config.minecraft.username, authMode: config.minecraft.auth, viewerPort: config.viewer.port, authRequired: Boolean(config.web.password) }));
  router.post('/api/bot/connect', requireAuth, (req, res) => { botManager.connect(); res.json({ ok: true, state: botManager.state }); });
  router.post('/api/bot/disconnect', requireAuth, (req, res) => { botManager.disconnect(); res.json({ ok: true }); });
  router.post('/api/bot/stop', requireAuth, (req, res) => { botManager.stopAll(); res.json({ ok: true }); });
  router.get('/api/bot/inventory', requireAuth, (req, res) => res.json({ items: botManager.inventory.list() }));
  return router;
}
module.exports = createRoutes;

const logger = require('../utils/logger');
class ViewerManager {
  constructor(config) { this.config = config; this.active = false; }
  start(bot) {
    if (this.active || !bot) return;
    try {
      const { mineflayer: viewer } = require('prismarine-viewer');
      viewer(bot, { port: this.config.viewer.port, firstPerson: true });
      this.active = true;
      logger.info(`Prismarine viewer listening on ${this.config.viewer.port}`);
    } catch (error) { logger.error('Viewer failed to start.', { error: error.message }); }
  }
  stop() { this.active = false; logger.info('Viewer marked stopped; prismarine-viewer will close with the bot session.'); }
  url() { return `http://localhost:${this.config.viewer.port}`; }
}
module.exports = ViewerManager;

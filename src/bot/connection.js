const EventEmitter = require('events');
const mineflayer = require('mineflayer');
const logger = require('../utils/logger');
const MovementController = require('./movement');
const CameraController = require('./camera');
const ChatController = require('./chat');
const InventoryController = require('./inventory');
const { buildStatus } = require('./status');

class BotManager extends EventEmitter {
  constructor(config, viewer) { super(); this.config = config; this.viewer = viewer; this.bot = null; this.state = 'offline'; this.manualDisconnect = false; this.reconnectTimer = null; this.movement = new MovementController(() => this.bot); this.camera = new CameraController(() => this.bot); this.chat = new ChatController(() => this.bot); this.inventory = new InventoryController(() => this.bot); this.statusTimer = null; }
  setState(state, error) { this.state = state; this.emit('connection_state', { state, error, reconnectDelay: this.config.minecraft.reconnectDelay }); this.emitStatus(); }
  emitStatus() { this.emit('bot_status', buildStatus(this.state, this.bot)); }
  emitInventory() { this.emit('bot_inventory', this.inventory.list()); }
  connect() {
    if (this.bot || ['connecting','online','reconnecting'].includes(this.state)) return this.emitStatus();
    clearTimeout(this.reconnectTimer); this.manualDisconnect = false; this.setState(this.state === 'reconnecting' ? 'reconnecting' : 'connecting'); logger.info('Bot connecting', { host: this.config.minecraft.host, port: this.config.minecraft.port, username: this.config.minecraft.username });
    const options = { host: this.config.minecraft.host, port: this.config.minecraft.port, username: this.config.minecraft.username, version: this.config.minecraft.version, auth: this.config.minecraft.auth };
    this.bot = mineflayer.createBot(options); this.attachHandlers(this.bot);
  }
  attachHandlers(bot) {
    bot.once('spawn', () => { this.setState('online'); logger.info('Bot connected.'); this.viewer.start(bot); this.startStatusLoop(); this.emitInventory(); });
    bot.on('health', () => this.emitStatus()); bot.on('move', () => this.emit('bot_position', buildStatus(this.state, bot))); bot.on('heldItemChanged', () => this.emitInventory()); bot.on('windowOpen', () => this.emitInventory()); bot.on('messagestr', (message) => this.emit('bot_chat', { kind: 'server', message, at: Date.now() }));
    bot.on('error', (error) => { logger.error('Mineflayer error.', { error: error.message }); this.emit('error_message', error.message || 'Mineflayer error.'); });
    bot.once('kicked', (reason) => { logger.warn('Bot kicked.', { reason: String(reason) }); this.emit('bot_chat', { kind: 'system', message: `Kicked: ${String(reason)}`, at: Date.now() }); });
    bot.once('end', (reason) => this.handleEnd(reason));
  }
  startStatusLoop() { clearInterval(this.statusTimer); this.statusTimer = setInterval(() => { this.emitStatus(); this.emitInventory(); }, 1000); }
  handleEnd(reason) { logger.warn('Bot disconnected.', { reason }); this.movement.stopAllControls(); clearInterval(this.statusTimer); this.viewer.stop(); this.bot = null; if (this.manualDisconnect) { this.setState('offline'); return; } this.scheduleReconnect('Bot disconnected. Reconnecting soon.'); }
  scheduleReconnect(message) { if (this.reconnectTimer) return; this.setState('reconnecting', message); logger.info('Scheduling reconnect.', { delay: this.config.minecraft.reconnectDelay }); this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; this.connect(); }, this.config.minecraft.reconnectDelay); }
  disconnect() { this.manualDisconnect = true; clearTimeout(this.reconnectTimer); this.reconnectTimer = null; this.movement.stopAllControls(); if (this.bot) this.bot.quit('Dashboard disconnect'); else this.setState('offline'); }
  stopAll() { this.movement.stopAllControls(); this.emitStatus(); }
  shutdown() { this.manualDisconnect = true; this.disconnect(); }
}
module.exports = BotManager;

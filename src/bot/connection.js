const EventEmitter = require('events');
const mineflayer = require('mineflayer');
const logger = require('../utils/logger');
const MovementController = require('./movement');
const CameraController = require('./camera');
const ChatController = require('./chat');
const InventoryController = require('./inventory');
const PvpController = require('./pvp');
const { buildStatus } = require('./status');

class BotManager extends EventEmitter {
  constructor(config, viewer) {
    super();
    this.config = config;
    this.viewer = viewer;
    this.bot = null;
    this.state = 'offline';
    this.manualDisconnect = false;
    this.reconnectTimer = null;
    this.lastConnectOptions = { ...config.minecraft };
    this.statusTimer = null;

    this.movement = new MovementController(() => this.bot);
    this.camera = new CameraController(() => this.bot);
    this.chat = new ChatController(() => this.bot);
    this.inventory = new InventoryController(() => this.bot);
    this.pvp = new PvpController(() => this.bot, (status) => this.emit('pvp_status', status));
  }

  setState(state, error) {
    this.state = state;
    this.emit('connection_state', {
      state,
      error,
      reconnectDelay: this.config.minecraft.reconnectDelay,
      connectOptions: this.safeConnectOptions()
    });
    this.emitStatus();
  }

  safeConnectOptions() {
    const { host, port, version, username, auth } = this.lastConnectOptions;
    return { host, port, version, username, auth };
  }

  emitStatus() {
    this.emit('bot_status', buildStatus(this.state, this.bot, this.safeConnectOptions()));
    this.emit('pvp_status', this.pvp.status());
  }

  emitInventory() {
    this.emit('bot_inventory', this.inventory.list());
  }

  connect(overrides = {}) {
    if (this.bot || ['connecting', 'online', 'reconnecting'].includes(this.state)) {
      this.emitStatus();
      return this.safeConnectOptions();
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.manualDisconnect = false;
    this.lastConnectOptions = { ...this.lastConnectOptions, ...overrides };
    this.setState(this.state === 'reconnecting' ? 'reconnecting' : 'connecting');

    const options = {
      host: this.lastConnectOptions.host,
      port: this.lastConnectOptions.port,
      username: this.lastConnectOptions.username,
      version: this.lastConnectOptions.version,
      auth: this.lastConnectOptions.auth
    };

    logger.info('Bot connecting', {
      host: options.host,
      port: options.port,
      username: options.username,
      version: options.version,
      auth: options.auth
    });

    this.bot = mineflayer.createBot(options);
    this.attachHandlers(this.bot);
    return this.safeConnectOptions();
  }

  attachHandlers(bot) {
    bot.once('spawn', () => {
      this.setState('online');
      logger.info('Bot connected.');
      this.viewer.start(bot);
      this.startStatusLoop();
      this.emitInventory();
    });

    bot.on('health', () => this.emitStatus());
    bot.on('move', () => this.emit('bot_position', buildStatus(this.state, bot, this.safeConnectOptions())));
    bot.on('heldItemChanged', () => this.emitInventory());
    bot.on('windowOpen', () => this.emitInventory());
    bot.on('playerJoined', () => this.emit('pvp_status', this.pvp.status()));
    bot.on('playerLeft', () => this.emit('pvp_status', this.pvp.status()));
    bot.on('messagestr', (message) => this.emit('bot_chat', { kind: 'server', message, at: Date.now() }));
    bot.on('error', (error) => {
      logger.error('Mineflayer error.', { error: error.message });
      this.emit('error_message', error.message || 'Mineflayer error.');
    });
    bot.once('kicked', (reason) => {
      logger.warn('Bot kicked.', { reason: String(reason) });
      this.emit('bot_chat', { kind: 'system', message: `Kicked: ${String(reason)}`, at: Date.now() });
    });
    bot.once('end', (reason) => this.handleEnd(reason));
  }

  startStatusLoop() {
    clearInterval(this.statusTimer);
    this.statusTimer = setInterval(() => {
      this.emitStatus();
      this.emitInventory();
    }, 1000);
  }

  handleEnd(reason) {
    logger.warn('Bot disconnected.', { reason });
    this.movement.stopAllControls();
    this.pvp.stop();
    clearInterval(this.statusTimer);
    this.viewer.stop();
    this.bot = null;

    if (this.manualDisconnect) {
      this.setState('offline');
      return;
    }

    this.scheduleReconnect('Bot disconnected. Reconnecting soon.');
  }

  scheduleReconnect(message) {
    if (this.reconnectTimer) return;
    this.setState('reconnecting', message);
    logger.info('Scheduling reconnect.', { delay: this.config.minecraft.reconnectDelay });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.config.minecraft.reconnectDelay);
  }

  disconnect() {
    this.manualDisconnect = true;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.movement.stopAllControls();
    this.pvp.stop();

    if (this.bot) this.bot.quit('Dashboard disconnect');
    else this.setState('offline');
  }

  stopAll() {
    this.movement.stopAllControls();
    this.pvp.stop();
    this.emitStatus();
  }

  shutdown() {
    this.manualDisconnect = true;
    this.disconnect();
  }
}

module.exports = BotManager;

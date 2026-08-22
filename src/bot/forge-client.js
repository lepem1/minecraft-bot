const EventEmitter = require('events');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FORGE_REQUIRED = 'This server has mods that require Forge to be installed on the client.';

function diagnose(text) {
  const message = String(text || '');
  const value = message.toLowerCase();
  if (message.includes(FORGE_REQUIRED)) return 'FORGE_CLIENT_REQUIRED';
  if (/missing mods?|mod mismatch|incompatible mod/.test(value)) return 'FORGE_MOD_MISMATCH';
  if (/forge.+version|version.+forge/.test(value)) return 'FORGE_VERSION_MISMATCH';
  if (/minecraft.+version|unsupported client/.test(value)) return 'MINECRAFT_VERSION_MISMATCH';
  if (/auth|access token|invalid session|not authenticated/.test(value)) return 'AUTHENTICATION_FAILED';
  return null;
}

class ForgeClientManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.process = null;
    this.status = { state: 'DISCONNECTED', java: null, clientMods: 0, missingRequiredMods: [], pov: 'FORGE_POV_UNAVAILABLE' };
  }

  emitStatus(state, extra = {}) {
    this.status = { ...this.status, state, ...extra };
    this.emit('status', this.status);
  }

  async verifyJava() {
    return new Promise((resolve) => {
      const child = spawn(this.config.javaPath, ['-version']);
      let output = '';
      child.stderr.on('data', (data) => { output += data; });
      child.on('error', () => resolve({ ok: false, output: 'JAVA_NOT_FOUND' }));
      child.on('close', (code) => resolve(code === 0 ? { ok: true, output: output.trim() } : { ok: false, output: 'JAVA_NOT_FOUND' }));
    });
  }

  getModCount(modDirectory) {
    try { return fs.readdirSync(modDirectory).filter((file) => file.toLowerCase().endsWith('.jar')).length; } catch { return 0; }
  }

  async start(profile) {
    if (this.process) return this.status;
    const forge = { ...this.config, forgeVersion: profile.forgeVersion || this.config.forgeVersion, modDirectory: profile.modDirectory || this.config.modDirectory };
    if (profile.version !== '1.20.1') {
      this.emitStatus('ERROR', { diagnostic: 'MINECRAFT_VERSION_MISMATCH' });
      return this.status;
    }
    if (!forge.forgeVersion) {
      this.emitStatus('ERROR', { diagnostic: 'FORGE_VERSION_MISMATCH', message: 'Forge 47.x version is required.' });
      return this.status;
    }
    this.emitStatus('STARTING_FORGE', { diagnostic: null, minecraftVersion: profile.version, forgeVersion: forge.forgeVersion });
    const java = await this.verifyJava();
    if (!java.ok) {
      this.emitStatus('ERROR', { diagnostic: 'JAVA_NOT_FOUND', message: 'Java 17 is required for Forge 1.20.1.' });
      return this.status;
    }
    this.emitStatus('LOADING_MODS', { java: java.output, clientMods: this.getModCount(forge.modDirectory), modDirectory: forge.modDirectory });
    if (!this.config.clientCommand) {
      this.emitStatus('ERROR', { diagnostic: 'FORGE_HEADLESS_CLIENT_UNAVAILABLE', message: 'Set FORGE_CLIENT_COMMAND to a genuine, Microsoft-authenticated headless Forge 1.20.1 client runner. Forge itself does not provide a generic headless game client.' });
      return this.status;
    }
    const environment = { ...process.env, MINECRAFT_HOST: profile.host, MINECRAFT_PORT: String(profile.port), MINECRAFT_VERSION: profile.version, FORGE_VERSION: forge.forgeVersion, MOD_DIRECTORY: path.resolve(forge.modDirectory) };
    this.emitStatus('CONNECTING');
    this.process = spawn(this.config.clientCommand, { shell: true, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
    const consume = (chunk) => this.consumeOutput(chunk.toString());
    this.process.stdout.on('data', consume);
    this.process.stderr.on('data', consume);
    this.process.on('error', (error) => this.emitStatus('ERROR', { message: error.message }));
    this.process.on('exit', (code) => {
      this.process = null;
      if (!['STOPPING', 'KICKED'].includes(this.status.state)) this.emitStatus('ERROR', { message: `Forge client exited with code ${code}.` });
      else this.emitStatus('DISCONNECTED');
    });
    return this.status;
  }

  consumeOutput(text) {
    const diagnostic = diagnose(text);
    if (diagnostic) this.emitStatus('KICKED', { diagnostic, kickMessage: text.trim() });
    else if (/forge.*handshake|handshake.*forge/i.test(text)) this.emitStatus('FORGE_HANDSHAKE');
    else if (/joining world|loading terrain/i.test(text)) this.emitStatus('SPAWNING');
    else if (/joined the game|connection established|forge_client_connected/i.test(text)) this.emitStatus('CONNECTED');
    this.emit('log', text.trim());
  }

  stop() { if (!this.process) return this.emitStatus('DISCONNECTED'); this.emitStatus('STOPPING'); this.process.kill('SIGTERM'); }
}

module.exports = ForgeClientManager;
module.exports.diagnose = diagnose;

const allowedControls = new Set(['forward', 'back', 'left', 'right', 'jump', 'sneak', 'sprint']);
const allowedTypes = new Set(['connect_bot', 'disconnect_bot', 'control', 'camera', 'chat', 'stop_all', 'request_status', 'request_inventory', 'auth']);
function parseJson(raw) { try { return { ok: true, value: JSON.parse(raw) }; } catch { return { ok: false, error: 'Invalid JSON.' }; } }
function validateWsMessage(message) {
  if (!message || typeof message !== 'object' || !allowedTypes.has(message.type)) return { ok: false, error: 'Unknown or missing message type.' };
  if (message.type === 'control') {
    if (!allowedControls.has(message.action) || typeof message.pressed !== 'boolean') return { ok: false, error: 'Invalid control command.' };
  }
  if (message.type === 'camera') {
    if (!Number.isFinite(message.yaw) || !Number.isFinite(message.pitch)) return { ok: false, error: 'Invalid camera angles.' };
    if (message.pitch < -Math.PI / 2 || message.pitch > Math.PI / 2) return { ok: false, error: 'Camera pitch out of range.' };
  }
  if (message.type === 'chat') {
    if (typeof message.message !== 'string' || message.message.trim().length === 0 || message.message.length > 256) return { ok: false, error: 'Chat must be 1-256 characters.' };
  }
  if (message.type === 'auth' && typeof message.password !== 'string') return { ok: false, error: 'Invalid password.' };
  return { ok: true };
}
module.exports = { allowedControls, parseJson, validateWsMessage };

import { DashboardSocket } from './websocket.js';
import { setupControls } from './controls.js';
import { setupPov, setViewerUrl } from './pov.js';
import { renderInventory } from './inventory.js';
import { setupPvp, renderPvp } from './pvp.js';
import { updateStatus, addChat, showError, setupCollapsibles, populateConnectForm } from './ui.js';

const state = {
  connected: false,
  pointerActive: false,
  status: { state: 'offline', position: { x: 0, y: 0, z: 0 } },
  inventory: [],
  pvp: { enabled: false, targets: [] },
  config: {}
};

const socket = new DashboardSocket(state, (message) => {
  if (message.type === 'bot_status' || message.type === 'bot_position') {
    state.status = message.data;
    updateStatus(state);
  }

  if (message.type === 'connection_state') {
    state.status = { ...state.status, state: message.data.state, online: message.data.state === 'online' };
    updateStatus(state);
    if (message.data.error) showError(message.data.error);
  }

  if (message.type === 'bot_chat') addChat(message.data);

  if (message.type === 'bot_inventory') {
    state.inventory = message.data;
    renderInventory(message.data);
  }

  if (message.type === 'pvp_status') {
    state.pvp = message.data;
    renderPvp(message.data);
  }

  if (message.type === 'pvp_attack') {
    addChat({ kind: 'system', message: `Attacked ${message.data.username} at ${message.data.distance.toFixed(1)} blocks.` });
  }

  if (message.type === 'error') showError(typeof message.data === 'string' ? message.data : JSON.stringify(message.data));
});

socket.connect();
setupControls(socket);
setupPov(state, socket);
setupPvp(socket, state);
setupCollapsibles();

async function loadConfig() {
  const response = await fetch('/api/config');
  const config = await response.json();
  state.config = config;
  populateConnectForm(config);
  setViewerUrl(config);
  document.getElementById('password').style.display = config.authRequired ? 'block' : 'none';
  updateStatus(state);
}

function getPassword() {
  return document.getElementById('password').value;
}

function getConnectOptions() {
  return {
    host: document.getElementById('serverHost').value,
    port: Number(document.getElementById('serverPort').value),
    username: document.getElementById('botUsernameInput').value,
    version: document.getElementById('mcVersion').value,
    auth: document.getElementById('authMode').value
  };
}

async function api(path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' };
  const password = getPassword();
  if (password) headers['x-dashboard-password'] = password;

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) throw new Error((await response.json()).error || response.statusText);
  return response.json();
}

document.getElementById('connectBtn').addEventListener('click', async () => {
  try {
    const password = getPassword();
    if (password) socket.send({ type: 'auth', password });
    await api('/api/bot/connect', 'POST', getConnectOptions());
  } catch (error) {
    showError(error.message);
  }
});

document.getElementById('disconnectBtn').addEventListener('click', async () => {
  try {
    await api('/api/bot/disconnect', 'POST');
  } catch (error) {
    showError(error.message);
  }
});

document.getElementById('chatForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('chatInput');
  socket.send({ type: 'chat', message: input.value });
  input.value = '';
});

loadConfig().catch((error) => showError(error.message));
updateStatus(state);
renderInventory([]);
renderPvp(state.pvp);

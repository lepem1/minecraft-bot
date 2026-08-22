# Minecraft Bot Control Dashboard

A Node.js web application for connecting a Mineflayer bot to a Minecraft Java Edition server, viewing a live Prismarine-rendered first-person POV, and controlling movement, camera, chat, read-only inventory, and a manual PvP target lock from a browser.

This project is intended for servers you own or are explicitly allowed to use. It does not bypass authentication, anti-cheat, CAPTCHA, server permissions, or access controls. The bot connects normally using the host, port, username, version, and auth mode you provide in the dashboard or `.env`.

## Requirements

- Node.js 20 or newer
- npm
- A Minecraft Java Edition server you own or are authorized to use
- A server version supported by Mineflayer and Prismarine packages

## Installation

```bash
cd minecraft-bot-dashboard
npm install
cp .env.example .env
npm start
```

If this repository is already checked out at `/workspace/minecraft-bot`, run the commands from that directory.

## Environment configuration

Edit `.env` after copying `.env.example`:

```env
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_VERSION=1.20.4
BOT_USERNAME=MyBot
MINECRAFT_AUTH=offline
WEB_HOST=0.0.0.0
WEB_PORT=3000
VIEWER_PORT=3007
BOT_RECONNECT_DELAY=5000
DASHBOARD_PASSWORD=12345
LOG_LEVEL=info
```

`DASHBOARD_PASSWORD` defaults to `12345` in this project. Change it before exposing the dashboard beyond your own trusted network.

Use `MINECRAFT_AUTH=microsoft` only when your server requires Microsoft authentication and the installed Mineflayer version supports that flow. This application never attempts to bypass authentication.

## Running locally

- `npm start` starts the production server.
- `npm run dev` starts the server with nodemon.
- `npm run check` performs JavaScript syntax checks.

Open `http://localhost:3000`, enter the dashboard password, type the Minecraft server IP/host, port, bot name, version, and auth mode, then click **Connect**. The Prismarine POV is served separately on `VIEWER_PORT` and embedded in the dashboard.

## Vercel / serverless deployment note

The repository includes `vercel.json` and `api/vercel-health.js` so the static dashboard and a serverless health endpoint can be deployed to Vercel. However, live Minecraft bot control is **not serverless-compatible** because Mineflayer, WebSockets, TCP Minecraft connections, reconnection timers, and `prismarine-viewer` need a long-running Node.js process.

For an online deployment that can actually join Minecraft servers, run this app on a persistent Node host such as a VPS, home server, Docker host, Railway/Fly/Render-style long-running service, or another platform that supports long-lived TCP and WebSocket processes. Vercel can still be used as a static frontend in front of that persistent backend if you add a backend URL configuration later.

## Dashboard features

- Connect and disconnect the bot through REST endpoints.
- Type the server IP/host and port directly on the website before connecting.
- Rename the bot from the website before each connection by changing the bot name field.
- Live WebSocket status updates for online state, health, food, coordinates, yaw, pitch, dimension, game mode, and ping.
- First-person Prismarine 3D renderer that follows the bot session. It is a browser world renderer, not a pixel-perfect vanilla client video capture.
- Keyboard and touch movement controls using press/release semantics: W/A/S/D, Space, Shift, and Ctrl.
- Mouse and button camera controls with throttled WebSocket updates.
- Emergency **STOP EVERYTHING** button that releases all movement controls and disables PvP target lock.
- Chat panel for sending normal Minecraft chat and reading incoming messages.
- Read-only inventory viewer showing slot, item name, count, and durability information when available.
- Manual PvP target lock: the bot can lock its camera onto a nearby player and perform one range-limited manual attack when you press **Attack Once**. It does not provide anti-cheat bypasses or automatic command execution.
- Dashboard password protection with `DASHBOARD_PASSWORD=12345` by default.

## REST API

- `GET /health`
- `GET /api/status`
- `GET /api/config` exposes only non-secret dashboard configuration
- `POST /api/bot/connect` accepts `host`, `port`, `username`, `version`, and `auth`
- `POST /api/bot/disconnect`
- `POST /api/bot/stop`
- `GET /api/bot/inventory`
- `GET /api/bot/pvp`
- `POST /api/bot/pvp/lock`
- `POST /api/bot/pvp/attack`

When `DASHBOARD_PASSWORD` is set, protected endpoints require the `x-dashboard-password` header.

## WebSocket protocol

Client messages: `auth`, `connect_bot`, `disconnect_bot`, `control`, `camera`, `chat`, `stop_all`, `request_status`, `request_inventory`, `pvp_lock`, `pvp_attack`, and `pvp_request_targets`.

Server messages: `connection_state`, `bot_status`, `bot_position`, `bot_chat`, `bot_inventory`, `pvp_status`, `pvp_attack`, and `error`.

Incoming messages are validated, unknown commands are rejected, chat length is limited, connect options are allowlisted by shape, and basic WebSocket rate limiting is enforced.

## Troubleshooting

- **Server unavailable**: verify the host/port typed in the dashboard, firewall rules, and that the Minecraft server is running.
- **Version mismatch**: set the dashboard version field to the server version, for example `1.20.4`.
- **Authentication fails**: use the correct Mineflayer auth mode for your server. Online-mode public servers generally require Microsoft authentication.
- **POV does not load**: verify `VIEWER_PORT` is available and not blocked. The viewer starts only after the bot spawns.
- **Controls do nothing**: click the POV/control area and confirm the bot is online. If a dashboard password is configured, authenticate by entering it before connecting.
- **Vercel deployment loads but cannot control a bot**: move the backend to a persistent Node host. This is a platform limitation of serverless functions, not a dashboard UI issue.

## Security notes

The app is intended for personal or trusted use. It never exposes `.env` contents or Minecraft credentials, does not execute shell commands from the browser, does not use `eval()`, escapes chat before rendering, validates server connection input, and does not provide arbitrary Minecraft command execution.

## Project structure

```text
api               Vercel-compatible serverless informational endpoint
src/config        Environment loading
src/bot           Connection, movement, camera, chat, inventory, PvP lock, status modules
src/server        Express routes and WebSocket protocol
src/viewer        Isolated Prismarine viewer integration
src/utils         Logging and validation helpers
public            Vanilla HTML/CSS/JS dashboard
logs              Runtime log location placeholder
```

## Future upgrade path

The viewer module is isolated so a later pixel-perfect architecture can replace it without rewriting dashboard controls:

```text
Minecraft Client -> Virtual Display -> Video Encoder -> WebRTC -> Browser
```

The modular bot manager also leaves room for future features such as pathfinding, follow player, waypoints, multiple bot profiles, player/entity lists, permissions, recording, screenshots, and strictly allowlisted command tooling.

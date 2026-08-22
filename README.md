# Minecraft Bot Control Dashboard

A local Node.js web application for connecting a Mineflayer bot to your own Minecraft Java Edition server, viewing a live Prismarine-rendered first-person POV, and controlling movement, camera, chat, and read-only inventory from a browser.

This project does not bypass authentication, anti-cheat, CAPTCHA, server permissions, or access controls. The bot connects normally using the server and authentication configuration you provide.

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
DASHBOARD_PASSWORD=
LOG_LEVEL=info
```

Use `MINECRAFT_AUTH=microsoft` only when your server requires Microsoft authentication and the installed Mineflayer version supports that flow. This application never attempts to bypass authentication.

## Running

- `npm start` starts the production server.
- `npm run dev` starts the server with nodemon.
- `npm run check` performs JavaScript syntax checks.

Open `http://localhost:3000` and click **Connect**. The Prismarine POV is served separately on `VIEWER_PORT` and embedded in the dashboard.

## Dashboard features

- Connect and disconnect the bot through REST endpoints.
- Live WebSocket status updates for online state, health, food, coordinates, yaw, pitch, dimension, game mode, and ping.
- First-person Prismarine 3D renderer that follows the bot session. It is a browser world renderer, not a pixel-perfect vanilla client video capture.
- Keyboard and touch movement controls using press/release semantics: W/A/S/D, Space, Shift, and Ctrl.
- Mouse and button camera controls with throttled WebSocket updates.
- Emergency **STOP EVERYTHING** button that releases all movement controls.
- Chat panel for sending normal Minecraft chat and reading incoming messages.
- Read-only inventory viewer showing slot, item name, count, and durability information when available.
- Optional dashboard password with `DASHBOARD_PASSWORD`.

## REST API

- `GET /health`
- `GET /api/status`
- `GET /api/config` exposes only non-secret dashboard configuration
- `POST /api/bot/connect`
- `POST /api/bot/disconnect`
- `POST /api/bot/stop`
- `GET /api/bot/inventory`

When `DASHBOARD_PASSWORD` is set, protected endpoints require the `x-dashboard-password` header.

## WebSocket protocol

Client messages: `auth`, `connect_bot`, `disconnect_bot`, `control`, `camera`, `chat`, `stop_all`, `request_status`, and `request_inventory`.

Server messages: `connection_state`, `bot_status`, `bot_position`, `bot_chat`, `bot_inventory`, and `error`.

Incoming messages are validated, unknown commands are rejected, chat length is limited, and basic WebSocket rate limiting is enforced.

## Troubleshooting

- **Server unavailable**: verify `MINECRAFT_HOST`, `MINECRAFT_PORT`, firewall rules, and that the Minecraft server is running.
- **Version mismatch**: set `MINECRAFT_VERSION` to the server version, for example `1.20.4`.
- **Authentication fails**: use the correct Mineflayer auth mode for your server. Online-mode public servers generally require Microsoft authentication.
- **POV does not load**: verify `VIEWER_PORT` is available and not blocked. The viewer starts only after the bot spawns.
- **Controls do nothing**: click the POV/control area and confirm the bot is online. If a dashboard password is configured, authenticate by entering it before connecting.

## Security notes

The app is intended for personal/local use. It never exposes `.env` contents or Minecraft credentials, does not execute shell commands from the browser, does not use `eval()`, escapes chat before rendering, and does not provide arbitrary Minecraft command execution.

## Project structure

```text
src/config        Environment loading
src/bot           Connection, movement, camera, chat, inventory, status modules
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

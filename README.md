# ProgrammerJackbox

## Description

ProgrammerJackbox is a local multiplayer game server built with Express and Socket.IO. Players join a shared room by code — one player hosts, others join using the room code.

The server supports the following game modes:

- **LogicCAH** — Logic-based prompt/answer selection game, inspired by Cards Against Humanity.
- **ProgrammerProphunt** — Coders hide in code lines and finders guess the hidden player.
- **CodeTyper** — Single-player speed-typing challenge with code snippets.
- **CodeTyper Multiplayer** — Competitive multiplayer code-typing race.
- **Escape the Loop** — Single-player grid puzzle where you program a robot to escape.
- **Flexbox Spider** — CSS Flexbox-based puzzle game.
- **Bug Fixer** — Find and fix bugs in code snippets.
- **Optimizer** — Optimize code to meet performance targets.

## Setup and Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (included with Node.js)

### Installation

```bash
git clone https://github.com/BenBank11/ProgrammerJackbox.git
cd ProgrammerJackbox
npm install
```

## Running Locally

The server binds to `0.0.0.0` by default, making it accessible to other devices on the same local network.

- **Local access:** `http://localhost:3000`
- **LAN access:** Use the host machine's local IP (e.g. `http://192.168.1.x:3000`). Other devices on the same Wi-Fi/LAN can connect using this address.

> **Note:** Ensure your firewall allows inbound connections on the configured port.

## Deployment

This project can be deployed as a **Web Service** on [Render](https://render.com):

1. Connect your GitHub repository to Render.
2. Create a new **Web Service** with the following settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Render automatically sets the `PORT` environment variable — no manual configuration needed.
4. Once deployed, Render provides a public `.onrender.com` URL for access.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port the server listens on | `3000` |

No `.env` file is required for local development. If you need to override the port, set the variable before starting the server:

```bash
PORT=8080 npm start
```

## Architecture Overview

TODO

## Project Structure

TODO

## Known Issues and Limitations

TODO

## Future Work

TODO

## Additional Documentation

TODO

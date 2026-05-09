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

This is a basic Node.js and Express app. It uses Socket.IO to handle the multiplayer lobbies and keep players in sync. Multiplayer games run their main logic on the server and talk to the browsers, while single-player games just load as normal web pages.

## Project Structure

- `server.js`: Handles the server, socket connections, and rooms.
- `public/`: The main lobby files (HTML, CSS, and some JS to connect).
- `gameModes/`: Folders for each game. These usually have their own HTML, CSS, and JS files, plus any server code they need.

## Known Issues

- `optimizerGame` is on the list but isn't built yet.
- You can't switch lobbies from private to public, which means "Quick Play" is broken.
- The chat doesn't work (players can't see messages from each other).
- The Profile and Settings pages are just placeholders for now.
- The styling is a bit all over the place between the main site and the different games.
- Nothing saves if the server restarts because there's no database.
- There are some old, unused Python scripts lying around, and `bugFixerGame` has too much of its code crammed into `server.js`.

## Future Work

- Fix the public lobbies and get the chat working.
- Move the `bugFixerGame` code out of `server.js` so it matches how the other games are set up.
- Delete the old Python files.
- Clean up the CSS so everything looks like it belongs to the same game.
- Finish building `programmerProphunt` and implement `optimizerGame`.
- Add a simple database to save profiles and scores.

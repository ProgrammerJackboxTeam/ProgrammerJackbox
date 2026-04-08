# ProgrammerJackbox

## Overview

ProgrammerJackbox is a local multiplayer game server using Express and Socket.IO. It supports two game modes:

- `LogicCAH`: logic-based prompt/answer selection game like Cards Against Humanity.
- `ProgrammerProphunt`: coders hide in code lines and finders guess the hidden player.

Players join a shared room by code; one player hosts, others join by room code.

## Project Structure

- `server.js` - Express + Socket.IO backend. Handles room lifecycle, game actions, and real-time events.
- `public/` - client-side web app, including `client.js` and `index.html`.
- `gameModes/LogicCAH/LogicCAH.js` - rules and state management for LogicCAH.
- `gameModes/programmerProphunt/ProgrammerProphunt.js` - rules and state management for ProgrammerProphunt.

## Features Implemented

- Host creates a room with random 6-character code (uppercase alphanumeric).
- Join room by code + name, with existence check.
- Player list sync using `update-players` event.
- Host can start game with custom settings (rounds/time limit/complexity/prompts).
- LogicCAH flow:
    - players submit answers
    - decider picks best answer
    - selected player gets points
    - round progression and game over state.
- ProgrammerProphunt flow:
    - hiders submit code lines
    - finders select hidden line
    - scoring and round progression.
- Graceful disconnect handling with player removal and room cleanup.

## Network Accessibility

- Server listens on `0.0.0.0:3000` for LAN access.
- Default local page: `http://localhost:3000`.
- Use host machine IP (e.g. `http://192.168.1.193:3000`) for other devices on same network.
- No public internet access by default unless you configure router port forwarding.

## Security Notes

- Room code is only shared key for joining.
- No password / blocking currently implemented.
- Keep server local to avoid external access risk.

## Setup and Run

```bash
npm install
node server.js
```

1. Confirmed `server.js` behavior and room/join logic.
2. Updated server binding to `0.0.0.0` (external LAN available).
3. Guided firewall setup and correct LAN IP discovery (`192.168.1.193`).
4. Diagnosed and fixed connection issue (`ERR_CONNECTION_TIMED_OUT` from wrong IP / blocked port).

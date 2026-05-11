const SERVER_URL = process.env.SIM_SERVER_URL || process.env.SERVER_URL || "http://localhost:3000";
const SOCKET_PATH = process.env.SIM_SOCKET_PATH || process.env.SOCKET_PATH || "/socket.io";

function normalizeTransportMode(value) {
    const mode = String(value || "mixed").trim().toLowerCase();
    if (mode === "websocket" || mode === "polling" || mode === "mixed") {
        return mode;
    }
    return "mixed";
}

function getTransports() {
    const mode = normalizeTransportMode(process.env.SIM_TRANSPORT_MODE);
    if (mode === "websocket") {
        return ["websocket"];
    }
    if (mode === "polling") {
        return ["polling"];
    }
    return ["websocket", "polling"];
}

function getSocketOptions(overrides = {}) {
    return {
        path: SOCKET_PATH,
        transports: getTransports(),
        forceNew: true,
        reconnection: false,
        timeout: 10000,
        ...overrides,
    };
}

module.exports = {
    SERVER_URL,
    SOCKET_PATH,
    getSocketOptions,
    normalizeTransportMode,
};

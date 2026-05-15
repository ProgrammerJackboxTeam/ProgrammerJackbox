#!/usr/bin/env node

/**
 * Test all game simulations against a Render deployment or a local Render-like environment.
 * Usage: npm run test:render -- https://your-app.onrender.com
 * Optional flags:
 *   --mode=auto|remote|local
 *   --rounds=3
 *   --test-retries=1
 *   --timeout-ms=120000
 *   --socket-path=/socket.io
 *   --warmup-timeout-ms=180000
 */

const { spawn } = require("child_process");
const http = require("http");
const https = require("https");
const net = require("net");
const path = require("path");
const { normalizeTransportMode } = require("./simConfig");

const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_TEST_RETRIES = 1;
const DEFAULT_ROUNDS = 1;
const DEFAULT_WARMUP_TIMEOUT_MS = 180000;
const DEFAULT_SOCKET_PATH = "/socket.io";
const WARMUP_POLL_INTERVAL_MS = 5000;
const DEFAULT_MODE = "auto";

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const mode = normalizeMode(args.mode || DEFAULT_MODE);
    const providedUrl = normalizeUrl(args.url);

    const rounds = getNumericArg(args.rounds, DEFAULT_ROUNDS, 1);
    const testRetries = getNumericArg(args.testRetries, DEFAULT_TEST_RETRIES, 0);
    const timeoutMs = getNumericArg(args.timeoutMs, DEFAULT_TIMEOUT_MS, 15000);
    const warmupTimeoutMs = getNumericArg(args.warmupTimeoutMs, DEFAULT_WARMUP_TIMEOUT_MS, 30000);
    const socketPath = normalizeSocketPath(args.socketPath || DEFAULT_SOCKET_PATH);
    const transportModes = getTransportModes(args);

    const target = await resolveTarget({ mode, providedUrl });

    console.log(`\nMode: ${target.mode}`);
    console.log(`Testing all gamemodes against: ${target.baseUrl}`);
    console.log(`Rounds: ${rounds}`);
    console.log(`Per-test retries: ${testRetries}`);
    console.log(`Timeout per simulation: ${timeoutMs}ms`);
    console.log(`Socket path: ${socketPath}\n`);

    let finalExitCode = 1;

    try {
        await waitForDeploymentReady(target.baseUrl, warmupTimeoutMs, target.serverProcess);
        console.log("Preflight checks passed. Starting simulations.\n");

        const tests = [
            { name: "Lobby Flow", cmd: "sim:lobby:online" },
            { name: "Random Matchmaking", cmd: "sim:matchmaking:online" },
            { name: "Code Typer Multiplayer", cmd: "sim:codetyper:online" },
            { name: "Logic CAH", cmd: "sim:logiccah:online" },
            { name: "Bug Fixer", cmd: "sim:bugfixer:online" },
            { name: "Programmer Prophunt", cmd: "sim:prophunt:online" },
        ];

        let passed = 0;
        let failed = 0;
        const failures = [];

        for (const transportMode of transportModes) {
            console.log(`=== Transport Mode: ${transportMode} ===`);

            for (let round = 1; round <= rounds; round++) {
                console.log(`--- Round ${round}/${rounds} ---`);

                for (const test of tests) {
                    process.stdout.write(`${test.name}... `);

                    const result = await runTestWithRetries({
                        npmScript: test.cmd,
                        renderUrl: target.baseUrl,
                        socketPath,
                        timeoutMs,
                        retries: testRetries,
                        transportMode,
                    });

                    if (result.success) {
                        console.log("PASSED");
                        passed++;
                    } else {
                        console.log(`FAILED (${result.reason})`);
                        failed++;
                        failures.push({ transportMode, round, test: test.name, reason: result.reason });
                    }
                }

                console.log("");
            }
        }

        if (failures.length) {
            console.log("Failure summary:");
            failures.forEach((failure) => {
                console.log(
                    `- ${failure.transportMode} | Round ${failure.round} | ${failure.test} | ${failure.reason}`
                );
            });
            console.log("");
        }

        console.log(`${"=".repeat(60)}`);
        console.log(`Results: ${passed} passed, ${failed} failed`);
        console.log(`${"=".repeat(60)}\n`);

        if (failed === 0) {
            console.log("All tests passed across all rounds. Deployment looks stable.\n");
            finalExitCode = 0;
        } else {
            console.log("Some tests failed. Deployment may be unstable or has regressions.\n");
            finalExitCode = 1;
        }
    } finally {
        if (target.serverProcess) {
            await stopLocalServer(target.serverProcess);
        }
    }

    process.exit(finalExitCode);
}

function normalizeMode(value) {
    const lowered = String(value || DEFAULT_MODE)
        .trim()
        .toLowerCase();
    if (lowered === "remote" || lowered === "local" || lowered === "auto") {
        return lowered;
    }
    return DEFAULT_MODE;
}

async function resolveTarget({ mode, providedUrl }) {
    if (mode === "remote") {
        if (!providedUrl) {
            throw new Error("Remote mode requires a valid URL argument.");
        }
        return { mode: "remote", baseUrl: providedUrl, serverProcess: null };
    }

    if (mode === "local") {
        return startLocalTarget();
    }

    if (providedUrl) {
        return { mode: "remote", baseUrl: providedUrl, serverProcess: null };
    }

    console.log("No valid URL provided. Falling back to local Render-like simulation mode.");
    return startLocalTarget();
}

async function startLocalTarget() {
    const port = await findFreePort();
    const workspaceRoot = path.resolve(__dirname, "..");

    const env = {
        ...process.env,
        PORT: String(port),
        NODE_ENV: "production",
    };

    const serverProcess = spawn("node", ["server.js"], {
        cwd: workspaceRoot,
        env,
        stdio: "pipe",
        shell: false,
        windowsHide: true,
    });

    serverProcess.stdout.on("data", (data) => {
        process.stdout.write(`[local-server] ${data.toString()}`);
    });

    serverProcess.stderr.on("data", (data) => {
        process.stderr.write(`[local-server] ${data.toString()}`);
    });

    serverProcess.on("error", (err) => {
        process.stderr.write(`[local-server] failed to start: ${err.message}\n`);
    });

    return {
        mode: "local",
        baseUrl: `http://127.0.0.1:${port}`,
        serverProcess,
    };
}

function stopLocalServer(serverProcess) {
    return new Promise((resolve) => {
        if (!serverProcess || serverProcess.killed || serverProcess.exitCode !== null) {
            resolve();
            return;
        }

        let settled = false;
        const finalize = () => {
            if (settled) {
                return;
            }
            settled = true;
            resolve();
        };

        serverProcess.once("close", finalize);
        serverProcess.once("exit", finalize);
        serverProcess.kill();

        setTimeout(() => {
            finalize();
        }, 5000);
    });
}

function getNumericArg(value, fallback, minimum) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.max(minimum, parsed);
}

function findFreePort() {
    return new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.unref();
        probe.on("error", reject);
        probe.listen(0, "127.0.0.1", () => {
            const address = probe.address();
            const port = typeof address === "object" && address ? address.port : 0;
            probe.close((err) => {
                if (err) {
                    reject(err);
                } else if (!port) {
                    reject(new Error("Unable to allocate a free port."));
                } else {
                    resolve(port);
                }
            });
        });
    });
}

function parseArgs(argv) {
    const parsed = {
        mode: DEFAULT_MODE,
        url: "",
        rounds: DEFAULT_ROUNDS,
        testRetries: DEFAULT_TEST_RETRIES,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        warmupTimeoutMs: DEFAULT_WARMUP_TIMEOUT_MS,
        socketPath: DEFAULT_SOCKET_PATH,
        transportMode: "mixed",
        transportMatrix: false,
    };

    argv.forEach((arg) => {
        if (!arg || typeof arg !== "string") {
            return;
        }
        if (arg.startsWith("--mode=")) {
            parsed.mode = arg.split("=")[1];
            return;
        }
        if (arg.startsWith("--rounds=")) {
            parsed.rounds = Number(arg.split("=")[1]);
            return;
        }
        if (arg.startsWith("--test-retries=")) {
            parsed.testRetries = Number(arg.split("=")[1]);
            return;
        }
        if (arg.startsWith("--timeout-ms=")) {
            parsed.timeoutMs = Number(arg.split("=")[1]);
            return;
        }
        if (arg.startsWith("--warmup-timeout-ms=")) {
            parsed.warmupTimeoutMs = Number(arg.split("=")[1]);
            return;
        }
        if (arg.startsWith("--socket-path=")) {
            parsed.socketPath = arg.split("=")[1];
            return;
        }
        if (arg.startsWith("--transport-mode=")) {
            parsed.transportMode = arg.split("=")[1];
            return;
        }
        if (arg === "--transport-matrix") {
            parsed.transportMatrix = true;
            return;
        }
        if (!arg.startsWith("--") && !parsed.url) {
            parsed.url = arg;
        }
    });

    return parsed;
}

function normalizeUrl(value) {
    if (!value) {
        return "";
    }
    const trimmed = String(value).trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        return "";
    }
    return trimmed.replace(/\/$/, "");
}

function normalizeSocketPath(value) {
    const raw = String(value || DEFAULT_SOCKET_PATH).trim();
    if (!raw) {
        return DEFAULT_SOCKET_PATH;
    }
    return raw.startsWith("/") ? raw : `/${raw}`;
}

async function waitForDeploymentReady(baseUrl, warmupTimeoutMs, localServerProcess = null) {
    const deadline = Date.now() + warmupTimeoutMs;
    let attempts = 0;
    let lastError = "";

    while (Date.now() < deadline) {
        if (localServerProcess && localServerProcess.exitCode !== null) {
            throw new Error(`Local simulation server exited early with code ${localServerProcess.exitCode}.`);
        }

        attempts += 1;
        try {
            await assertHttp200(`${baseUrl}/healthz`, 10000);
            await assertHttp200(`${baseUrl}/gamemodes.json`, 10000);
            console.log(`Preflight ready after ${attempts} check(s).`);
            return;
        } catch (err) {
            lastError = err.message || String(err);
            console.log(`Preflight attempt ${attempts} failed: ${lastError}`);
            await delay(WARMUP_POLL_INTERVAL_MS);
        }
    }

    throw new Error(`Deployment did not become ready in ${warmupTimeoutMs}ms. Last error: ${lastError}`);
}

function assertHttp200(urlString, timeoutMs) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(urlString);
        const client = urlObj.protocol === "https:" ? https : http;
        const request = client.get(
            urlObj,
            {
                timeout: timeoutMs,
                headers: {
                    "user-agent": "render-sim-preflight",
                },
            },
            (response) => {
                const statusCode = Number(response.statusCode || 0);
                response.resume();

                if (statusCode >= 200 && statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`Unexpected status ${statusCode} for ${urlString}`));
                }
            }
        );

        request.on("timeout", () => {
            request.destroy(new Error(`Timeout after ${timeoutMs}ms for ${urlString}`));
        });

        request.on("error", (err) => {
            reject(err);
        });
    }).catch((err) => {
        throw new Error(err.message || String(err));
    });
}

async function runTestWithRetries({ npmScript, renderUrl, socketPath, timeoutMs, retries, transportMode }) {
    let attempt = 0;
    let lastReason = "unknown-error";

    while (attempt <= retries) {
        attempt += 1;
        const result = await runTestOnce({
            npmScript,
            renderUrl,
            socketPath,
            timeoutMs,
            transportMode,
        });
        if (result.success) {
            return { success: true, reason: "ok" };
        }
        lastReason = result.reason;
        if (attempt <= retries) {
            process.stdout.write(`retry ${attempt}/${retries}... `);
        }
    }

    return { success: false, reason: lastReason };
}

function runTestOnce({ npmScript, renderUrl, socketPath, timeoutMs, transportMode }) {
    return new Promise((resolve) => {
        const env = {
            ...process.env,
            SIM_SERVER_URL: renderUrl,
            SIM_SOCKET_PATH: socketPath,
            SIM_TRANSPORT_MODE: transportMode,
        };

        const proc = spawn("npm", ["run", npmScript], {
            env,
            stdio: "pipe",
            shell: true,
        });

        let output = "";
        let timedOut = false;

        const timeoutHandle = setTimeout(() => {
            timedOut = true;
            proc.kill();
        }, timeoutMs);

        proc.stdout.on("data", (data) => {
            output += data.toString();
        });

        proc.stderr.on("data", (data) => {
            output += data.toString();
        });

        proc.on("close", (code) => {
            clearTimeout(timeoutHandle);
            if (timedOut) {
                resolve({ success: false, reason: `timeout-${timeoutMs}ms` });
                return;
            }
            if (code === 0) {
                resolve({ success: true, reason: "ok" });
                return;
            }

            const compactOutput = output
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean)
                .slice(-6)
                .join(" | ");

            resolve({
                success: false,
                reason: compactOutput || `exit-code-${code}`,
            });
        });

        proc.on("error", () => {
            clearTimeout(timeoutHandle);
            resolve({ success: false, reason: "spawn-error" });
        });
    });
}

function getTransportModes(args) {
    if (args.transportMatrix) {
        return ["mixed", "websocket", "polling"];
    }
    return [normalizeTransportMode(args.transportMode)];
}

main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
});

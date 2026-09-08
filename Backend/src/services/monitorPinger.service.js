import prisma from "../config/database.js";

const PING_INTERVAL_MS = 10000;
const REQUEST_TIMEOUT_MS = 5000;

let isChecking = false;

const isSuccessfulStatus = (statusCode) => {
    return statusCode >= 200 && statusCode < 400;
};

const markMonitorUp = async (monitorId) => {
    await prisma.monitor.update({
        where: {
            id: monitorId
        },
        data: {
            status: "UP",
            failureCount: 0,
            lastChecked: new Date()
        }
    });
};

const markMonitorFailed = async (monitor) => {
    const failureCount = monitor.failureCount + 1;
    const status = failureCount >= 3 ? "DOWN" : "DEGRADED";

    await prisma.monitor.update({
        where: {
            id: monitor.id
        },
        data: {
            status,
            failureCount,
            lastChecked: new Date()
        }
    });

    return { status, failureCount };
};

const checkMonitor = async (monitor) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(monitor.url, {
            signal: controller.signal
        });

        if (isSuccessfulStatus(response.status)) {
            await markMonitorUp(monitor.id);
            console.log(`[pinger] ${monitor.name} is UP (${response.status})`);
            return;
        }

        const result = await markMonitorFailed(monitor);
        console.log(
            `[pinger] ${monitor.name} is ${result.status} ` +
            `(failure ${result.failureCount}, HTTP ${response.status})`
        );
    } catch (error) {
        const result = await markMonitorFailed(monitor);
        const reason = error.name === "AbortError"
            ? `timeout after ${REQUEST_TIMEOUT_MS / 1000}s`
            : error.message;

        console.log(
            `[pinger] ${monitor.name} is ${result.status} ` +
            `(failure ${result.failureCount}, ${reason})`
        );
    } finally {
        clearTimeout(timeoutId);
    }
};

export const runMonitorChecks = async () => {
    if (isChecking) {
        console.log("[pinger] Previous check still running. Skipping this cycle.");
        return;
    }

    isChecking = true;

    try {
        const monitors = await prisma.monitor.findMany({
            select: {
                id: true,
                name: true,
                url: true,
                failureCount: true
            }
        });

        if (monitors.length === 0) {
            console.log("[pinger] No monitors found.");
            return;
        }

        await Promise.all(
            monitors.map(async (monitor) => {
                try {
                    await checkMonitor(monitor);
                } catch (error) {
                    console.log(`[pinger] Failed to update ${monitor.name}: ${error.message}`);
                }
            })
        );
    } catch (error) {
        console.log(`[pinger] Failed to read monitors: ${error.message}`);
    } finally {
        isChecking = false;
    }
};

export const startMonitorPinger = () => {
    console.log(`[pinger] Monitor pinger started. Checking every ${PING_INTERVAL_MS / 1000} seconds.`);

    runMonitorChecks();

    return setInterval(() => {
        runMonitorChecks();
    }, PING_INTERVAL_MS);
};

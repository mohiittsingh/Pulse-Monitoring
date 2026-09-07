import prisma from "../config/database.js";

const PING_INTERVAL_MS = 10000;

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

const markMonitorFailed = async (monitorId) => {
    await prisma.monitor.update({
        where: {
            id: monitorId
        },
        data: {
            status: "DOWN",
            failureCount: {
                increment: 1
            },
            lastChecked: new Date()
        }
    });
};

const checkMonitor = async (monitor) => {
    try {
        const response = await fetch(monitor.url);

        if (isSuccessfulStatus(response.status)) {
            await markMonitorUp(monitor.id);
            console.log(`[pinger] ${monitor.name} is UP (${response.status})`);
            return;
        }

        await markMonitorFailed(monitor.id);
        console.log(`[pinger] ${monitor.name} is DOWN (${response.status})`);
    } catch (error) {
        await markMonitorFailed(monitor.id);
        console.log(`[pinger] ${monitor.name} is DOWN (${error.message})`);
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
                url: true
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

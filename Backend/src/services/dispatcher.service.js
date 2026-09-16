import prisma from "../config/database.js";
import { sendMonitorJob } from "./sqs.service.js";

export const dispatchMonitorJobs = async () => {
    try {
        const monitors = await prisma.monitor.findMany({
            select: {
                id: true,
                url: true
            }
        });

        if (monitors.length === 0) {
            console.log("[dispatcher] No monitors found.");
            return;
        }

        for (const monitor of monitors) {
            await sendMonitorJob(monitor);

            console.log(
                `[dispatcher] Dispatched monitor ${monitor.id} → ${monitor.url}`
            );
        }

        console.log(
            `[dispatcher] Dispatched ${monitors.length} monitor job(s).`
        );
    } catch (error) {
        console.error(
            `[dispatcher] Failed to dispatch monitor jobs: ${error.message}`
        );
    }
};
import prisma from "../config/database.js";

export const createMonitor = async (req, res) => {
    try {
        const { name, url } = req.body;

        const monitor = await prisma.monitor.create({
            data: {
                name,
                url
            }
        });

        res.status(201).json(monitor);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to create monitor"
        });
    }
};

export const getMonitors = async (req, res) => {
    try {
        const monitors = await prisma.monitor.findMany();

        res.status(200).json(monitors);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch monitors"
        });
    }
};
import express from "express";

import {
    createMonitor,
    getMonitors
} from "../controllers/monitor.controller.js";

const router = express.Router();

router.post("/", createMonitor);
router.get("/", getMonitors);

export default router;
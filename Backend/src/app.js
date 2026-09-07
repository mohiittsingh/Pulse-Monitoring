import express from "express";
import monitorRoutes from "./routes/monitor.routes.js";
import { startMonitorPinger } from "./services/monitorPinger.service.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString()
    });
});

app.use("/api/monitors", monitorRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startMonitorPinger();
});

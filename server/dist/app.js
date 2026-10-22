import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { setupRequestsRouter } from "./routes/setup-requests.js";
import { sourcesRouter } from "./routes/sources.js";
import { testCasesRouter } from "./routes/test-cases.js";
export function createApp() {
    const app = express();
    app.disable("x-powered-by");
    app.use(cors({
        origin: env.FRONTEND_URL,
        methods: ["GET", "POST", "PATCH", "DELETE"],
    }));
    app.use(express.json({ limit: "1mb" }));
    app.use("/api/health", healthRouter);
    app.use("/api", sourcesRouter);
    app.use("/api", setupRequestsRouter);
    app.use("/api", testCasesRouter);
    app.use((_request, response) => {
        response.status(404).json({
            error: "NOT_FOUND",
            message: "The requested API endpoint does not exist.",
        });
    });
    return app;
}
//# sourceMappingURL=app.js.map
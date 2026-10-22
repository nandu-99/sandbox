import { createApp } from "./app.js";
import { env } from "./config/env.js";
const app = createApp();
const server = app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Sandbox Bootstrapper API listening on port ${env.PORT}.`);
});
function shutdown(signal) {
    console.log(`${signal} received. Closing the API server.`);
    server.close((error) => {
        if (error) {
            console.error("Failed to close the API server cleanly.", error);
            process.exitCode = 1;
        }
    });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
//# sourceMappingURL=index.js.map
const http = require("http");
const app = require("./src/app");
const { connectToDatabase } = require("./src/config/db");
const { env } = require("./src/config/env");

async function start() {
  await connectToDatabase();

  const server = http.createServer(app);

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      // eslint-disable-next-line no-console
      console.error(`[backend] port ${env.PORT} is already in use. Stop the other process or change PORT in backend/.env`);
      process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.error("[backend] server error", err);
    process.exit(1);
  });

  server.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[backend] listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    // eslint-disable-next-line no-console
    console.log(`[backend] received ${signal}, shutting down...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[backend] failed to start", err);
  process.exit(1);
});

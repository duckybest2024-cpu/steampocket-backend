import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { config } from "./lib/config";
import { CrashEngine } from "./sockets/crashEngine";

// Keep the process alive on unexpected errors — log them so they show up in
// the host's deploy logs instead of crash-looping the whole service.
process.on("uncaughtException", (err) => {
  console.error("FATAL uncaughtException (continuing):", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("FATAL unhandledRejection (continuing):", reason);
});

const app = createApp();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

new CrashEngine(io);

httpServer.listen(config.port, () => {
  console.log(`🎰 Casino Aurelius listening on :${config.port}`);
  console.log(`   REST API:   http://localhost:${config.port}`);
  console.log(`   Crash feed: ws://localhost:${config.port}/crash`);
});

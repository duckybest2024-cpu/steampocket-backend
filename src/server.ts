import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { config } from "./lib/config";
import { CrashEngine } from "./sockets/crashEngine";

const app = createApp();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

new CrashEngine(io);

httpServer.listen(config.port, () => {
  console.log(`🎰 steampocket-casino listening on :${config.port}`);
  console.log(`   REST API:   http://localhost:${config.port}`);
  console.log(`   Crash feed: ws://localhost:${config.port}/crash`);
});

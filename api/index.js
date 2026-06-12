// Vercel serverless entry point
// No Socket.IO — serverless functions don't support persistent WebSocket connections.
// Schema is pushed to the database on the first cold start.

const { execSync } = require("child_process");
const { createApp }  = require("../dist/app");

let app = null;
let dbReady = false;

function ensureDb() {
  if (dbReady) return;
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "inherit",
      env: { ...process.env },
      timeout: 25000,
    });
    dbReady = true;
  } catch (e) {
    console.error("prisma db push failed (DB may already be up to date):", e.message);
    dbReady = true; // continue anyway — tables may already exist
  }
}

function getApp() {
  if (!app) {
    ensureDb();
    app = createApp();
  }
  return app;
}

module.exports = (req, res) => getApp()(req, res);

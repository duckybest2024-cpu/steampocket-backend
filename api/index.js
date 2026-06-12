// Vercel serverless entry point — Express only, no Socket.IO (not supported on serverless)
const { createApp } = require("../dist/app");
module.exports = createApp();

#!/usr/bin/env node
const { spawn } = require("node:child_process");
const k6 = spawn("k6", ["run", "k6/flow-run.js"], { stdio: "inherit" });
k6.on("exit", (c) => process.exit(c));

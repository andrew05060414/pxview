#!/usr/bin/env node
"use strict";

/**
 * Cross-platform, CI-safe wrapper around D:\Andrew\Code\tools\build-slot.js.
 *
 * Delegates to build-slot.js ONLY when:
 *   1. process.platform === "win32"
 *   2. !process.env.CI
 *   3. D:\Andrew\Code\tools\build-slot.js (or process.env.BUILD_SLOT_PATH) exists
 *
 * On Linux/macOS/CI or when build-slot.js is absent, transparently executes
 * the target command directly.
 */

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const DEFAULT_BUILD_SLOT_PATH = "D:\\Andrew\\Code\\tools\\build-slot.js";

function resolveBuildSlotPath(env = process.env) {
  return env.BUILD_SLOT_PATH !== undefined ? env.BUILD_SLOT_PATH : DEFAULT_BUILD_SLOT_PATH;
}

function shouldUseBuildSlot(env = process.env, platform = process.platform) {
  if (platform !== "win32" || env.CI) return false;
  const p = resolveBuildSlotPath(env);
  return Boolean(p) && fs.existsSync(p);
}

function parseArgs(argv) {
  const sep = argv.indexOf("--");
  const opts = sep >= 0 ? argv.slice(0, sep) : [];
  const cmd = sep >= 0 ? argv.slice(sep + 1) : argv;
  let queue = "compile";
  let slots = null;
  for (let i = 0; i < opts.length; i += 1) {
    if (opts[i] === "--queue") {
      queue = opts[++i];
    } else if (opts[i] === "--slots") {
      slots = opts[++i];
    } else {
      throw new Error(`unknown option: ${opts[i]}`);
    }
  }
  return { queue, slots, cmd };
}

function buildSlotArgs(queue, slots, cmd, buildSlotPath) {
  const args = [buildSlotPath, "--queue", queue || "compile"];
  if (slots) args.push("--slots", String(slots));
  args.push("--", ...cmd);
  return args;
}

function quoteCmdArg(arg) {
  const s = String(arg);
  if (s.length === 0) return '""';
  return /[\s"&|<>^()%!]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

function isWindowsBatchCommand(command) {
  const base = path.basename(String(command)).toLowerCase();
  return /\.(cmd|bat)$/.test(base) || ["npm", "npx", "pnpm", "yarn", "jest"].includes(base);
}

function runWithBuildSlot(queue, cmd, options = {}) {
  const env = options.env || process.env;
  const platform = options.platform || process.platform;
  const slots = options.slots || null;
  const cwd = options.cwd || process.cwd();
  const stdio = options.stdio || "inherit";

  if (shouldUseBuildSlot(env, platform)) {
    const buildSlotPath = resolveBuildSlotPath(env);
    return spawnSync(process.execPath, buildSlotArgs(queue, slots, cmd, buildSlotPath), {
      cwd,
      env,
      stdio,
      shell: false,
      windowsHide: true,
    });
  }

  if (platform === "win32" && isWindowsBatchCommand(cmd[0])) {
    const comspec = env.ComSpec || "cmd.exe";
    const inner = cmd.map(quoteCmdArg).join(" ");
    return spawnSync(comspec, ["/d", "/s", "/c", `"${inner}"`], {
      cwd,
      env,
      stdio,
      shell: false,
      windowsVerbatimArguments: true,
      windowsHide: true,
    });
  }

  return spawnSync(cmd[0], cmd.slice(1), {
    cwd,
    env,
    stdio,
    shell: false,
    windowsHide: true,
  });
}

if (require.main === module) {
  const { queue, slots, cmd } = parseArgs(process.argv.slice(2));
  if (cmd.length === 0) {
    process.stderr.write("Usage: node scripts/with-build-slot.js [--queue <name>] [--slots <n>] -- <command> [args]\n");
    process.exit(2);
  }
  const res = runWithBuildSlot(queue, cmd, { slots });
  if (res.error) {
    process.stderr.write(`[with-build-slot] ${res.error.message}\n`);
    process.exit(127);
  }
  process.exit(res.status === null ? 1 : res.status);
}

module.exports = {
  resolveBuildSlotPath,
  shouldUseBuildSlot,
  parseArgs,
  buildSlotArgs,
  runWithBuildSlot,
};

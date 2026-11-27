"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const wrapper = require("./with-build-slot.js");
const WRAPPER_PATH = path.join(__dirname, "with-build-slot.js");

test("shouldUseBuildSlot gates on win32, non-CI, and existing build-slot.js", (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pxview-bs-"));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fakeSlot = path.join(tmp, "build-slot.js");
  fs.writeFileSync(fakeSlot, "");

  assert.equal(wrapper.shouldUseBuildSlot({ BUILD_SLOT_PATH: fakeSlot }, "win32"), true);
  assert.equal(wrapper.shouldUseBuildSlot({ BUILD_SLOT_PATH: fakeSlot, CI: "true" }, "win32"), false);
  assert.equal(wrapper.shouldUseBuildSlot({ BUILD_SLOT_PATH: fakeSlot }, "linux"), false);
  assert.equal(wrapper.shouldUseBuildSlot({ BUILD_SLOT_PATH: path.join(tmp, "missing.js") }, "win32"), false);
});

test("CLI delegates to BUILD_SLOT_PATH when active and runs transparently when CI=1 or missing", (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pxview-cli-"));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const stub = path.join(tmp, "stub-build-slot.js");
  fs.writeFileSync(stub, "console.log('STUB:' + JSON.stringify(process.argv.slice(2)));\n");

  const direct = spawnSync(
    process.execPath,
    [WRAPPER_PATH, "--queue", "test", "--", process.execPath, "-e", "console.log('DIRECT_OK')"],
    { encoding: "utf8", env: { ...process.env, BUILD_SLOT_PATH: stub, CI: "1" }, windowsHide: true }
  );
  assert.equal(direct.status, 0);
  assert.equal(direct.stdout.trim(), "DIRECT_OK");

  if (process.platform === "win32") {
    const delegated = spawnSync(
      process.execPath,
      [WRAPPER_PATH, "--queue", "compile", "--", "tsc", "--noEmit"],
      { encoding: "utf8", env: { ...process.env, BUILD_SLOT_PATH: stub, CI: "" }, windowsHide: true }
    );
    assert.equal(delegated.status, 0);
    assert.match(delegated.stdout, /^STUB:\["--queue","compile","--","tsc","--noEmit"\]/);
  }
});

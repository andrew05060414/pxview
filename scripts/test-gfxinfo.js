const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');

const script = path.join(__dirname, 'analyze-gfxinfo.js');
function run(text, hz = '100') {
  return spawnSync(process.execPath, [script, '-', hz], { input: text, encoding: 'utf8' });
}

// Synthetic rows, not device measurements. 10 ms vs 10 ms + 1 ns above 2^53.
const marker = '---PROFILEDATA---';
const capture = [
  'Janky frames: 999',
  marker, 'Flags,IntendedVsync,Vsync,FrameCompleted,',
  '0,9007199254740992,9007199254740992,9007199264740992,',
  '0,9007199254740992,9007199259740992,9007199264740993,',
  '1,1,1,30000000,',
  '0,1,1,9223372036854775807,', '0,2,2,0,', '0,2,2,',
  marker, marker, 'FrameCompleted,Flags,IntendedVsync,', '1000001,0,1,', marker,
].join('\r\n');
const result = run(capture);
assert.strictEqual(result.status, 0, result.stderr);
assert.deepStrictEqual(JSON.parse(result.stdout), {
  profile_blocks: 2, refresh_hz: 100, frames: 3, excluded_flagged: 1,
  excluded_invalid: 3, over_budget_frames: 1, p95_ms: 10.000001,
});
const descending = Array.from({ length: 20 }, (_, i) => `0,1,${1 + (20 - i) * 1e6}`);
const series = [marker, 'Flags,IntendedVsync,FrameCompleted', ...descending, marker];
assert.strictEqual(JSON.parse(run(series.join('\n')).stdout).p95_ms, 19);
for (const bad of ['Janky frames: 0', capture.slice(0, -marker.length),
  [marker, 'Flags,Vsync,FrameCompleted', marker].join('\n'),
  [marker, 'Flags,IntendedVsync,FrameCompleted', '1,1,2', marker].join('\n')]) {
  assert.strictEqual(run(bad).status, 1);
}
assert.strictEqual(run(capture, '0').status, 1);

const utf8Bom = Buffer.concat([
  Buffer.from([0xef, 0xbb, 0xbf]),
  Buffer.from(series.join('\n'), 'utf8'),
]);
assert.strictEqual(JSON.parse(run(utf8Bom).stdout).p95_ms, 19);

const utf16LeBom = Buffer.concat([
  Buffer.from([0xff, 0xfe]),
  Buffer.from(capture, 'utf16le'),
]);
assert.deepStrictEqual(JSON.parse(run(utf16LeBom).stdout), {
  profile_blocks: 2, refresh_hz: 100, frames: 3, excluded_flagged: 1,
  excluded_invalid: 3, over_budget_frames: 1, p95_ms: 10.000001,
});

const utf16BeBody = Buffer.from(capture, 'utf16le');
utf16BeBody.swap16();
const utf16BeBom = Buffer.concat([Buffer.from([0xfe, 0xff]), utf16BeBody]);
assert.deepStrictEqual(JSON.parse(run(utf16BeBom).stdout), {
  profile_blocks: 2, refresh_hz: 100, frames: 3, excluded_flagged: 1,
  excluded_invalid: 3, over_budget_frames: 1, p95_ms: 10.000001,
});

assert.strictEqual(run(Buffer.from([0xff, 0xfe, 0x30])).status, 1);
console.log('gfxinfo CLI checks passed (synthetic input)');

// Offline analysis of one Android gfxinfo framestats dump (Node 14+).
const fs = require('fs');

function fields(line) {
  return line.trim().replace(/,$/, '').split(',').map(value => value.trim());
}

function decodeText(buf) {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString('utf8');
  }
  const isUtf16Le = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe;
  const isUtf16Be = buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff;
  if (isUtf16Le || isUtf16Be) {
    const body = Buffer.from(buf.slice(2));
    if (body.length % 2 !== 0) throw new Error('Truncated UTF-16 input.');
    if (isUtf16Be) body.swap16();
    return body.toString('utf16le');
  }
  return buf.toString('utf8');
}

function analyze(text, hz) {
  const parts = text.split(/^[ \t]*---PROFILEDATA---[ \t]*\r?$/m);
  if (parts.length === 1 || parts.length % 2 === 0) {
    throw new Error('Expected complete ---PROFILEDATA--- blocks from gfxinfo framestats.');
  }
  const durations = [];
  let flagged = 0;
  let invalid = 0;
  let overBudget = 0;
  for (let i = 1; i < parts.length; i += 2) {
    const [header, ...rows] = parts[i].trim().split(/\r?\n/);
    const columns = fields(header);
    const indexes = ['Flags', 'IntendedVsync', 'FrameCompleted'].map(k => columns.indexOf(k));
    if (indexes.includes(-1)) throw new Error(`Missing required column in block ${(i + 1) / 2}.`);
    for (const row of rows) {
      if (!row.trim()) continue;
      const values = fields(row);
      const selected = indexes.map(j => values[j]);
      if (values.length !== columns.length || !selected.every(v => /^\d+$/.test(v))) {
        invalid++;
        continue;
      }
      const [flags, start, end] = selected.map(BigInt);
      if (flags !== 0n) {
        flagged++;
        continue;
      }
      if (start === 0n || end <= start || end >= 9223372036854775807n) {
        invalid++;
        continue;
      }
      const elapsed = end - start;
      // Compare in integer ns; rounding the budget to 16.67 ms changes boundary cases.
      if (elapsed * BigInt(hz) > 1000000000n) overBudget++;
      durations.push(Number(elapsed) / 1e6);
    }
  }
  if (!durations.length) throw new Error(`No usable frames (flagged: ${flagged}, invalid: ${invalid}).`);
  durations.sort((a, b) => a - b);
  return {
    profile_blocks: (parts.length - 1) / 2,
    refresh_hz: hz,
    frames: durations.length,
    excluded_flagged: flagged,
    excluded_invalid: invalid,
    over_budget_frames: overBudget,
    p95_ms: durations[Math.ceil(durations.length * 0.95) - 1],
  };
}

try {
  const [input, rate] = process.argv.slice(2);
  if (process.argv.length !== 4 || !/^[1-9]\d*$/.test(rate) || !Number.isSafeInteger(Number(rate))) {
    throw new Error('Usage: node scripts/analyze-gfxinfo.js <capture.txt | -> <integer refresh Hz>');
  }
  const text = decodeText(fs.readFileSync(input === '-' ? 0 : input));
  console.log(JSON.stringify(analyze(text, Number(rate)), null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

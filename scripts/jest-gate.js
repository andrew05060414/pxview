#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const baselinePath = path.resolve(__dirname, '../tests/jest-baseline.json');
if (!fs.existsSync(baselinePath)) {
  console.error('Error: Baseline file not found at ' + baselinePath);
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const minPassedTests = baseline.minPassedTests || 0;
const allowedFailedSuites = new Set(
  (baseline.allowedFailedSuites || []).map((s) => s.replace(/\\/g, '/'))
);

const outputFile = path.resolve(__dirname, '../_jest_gate_output.json');
if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

console.log('Running Jest baseline gate...');
const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const jestRun = spawnSync(
  npxCmd,
  ['jest', '--json', '--outputFile=' + outputFile],
  { stdio: 'inherit', shell: true }
);

if (!fs.existsSync(outputFile)) {
  console.error('Error: Jest output JSON not generated.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
try { fs.unlinkSync(outputFile); } catch (e) {}

const totalSuites = report.numTotalTestSuites;
const passedSuites = report.numPassedTestSuites;
const failedSuites = report.numFailedTestSuites;
const totalTests = report.numTotalTests;
const passedTests = report.numPassedTests;
const failedTests = report.numFailedTests;

console.log('\n--- Jest Baseline Gate Summary ---\n');
console.log('Suites: ' + passedSuites + ' passed, ' + failedSuites + ' failed, ' + totalSuites + ' total');
console.log('Tests:  ' + passedTests + ' passed, ' + failedTests + ' failed, ' + totalTests + ' total');
console.log('Baseline threshold: minPassedTests >= ' + minPassedTests);

let hasViolation = false;

const actualFailedSuites = report.testResults
  .filter((r) => r.status === 'failed')
  .map((r) => path.relative(path.resolve(__dirname, '..'), r.name).replace(/\\/g, '/'));

for (const suite of actualFailedSuites) {
  if (!allowedFailedSuites.has(suite)) {
    console.error('Gate violation: Failed suite not in baseline whitelist: ' + suite);
    hasViolation = true;
  }
}

if (passedTests < minPassedTests) {
  console.error('Gate violation: Passed tests count (' + passedTests + ') < baseline minimum (' + minPassedTests + ')');
  hasViolation = true;
}

if (hasViolation) {
  console.error('\n❌ Jest baseline gate: FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Jest baseline gate: PASSED');
  process.exit(0);
}
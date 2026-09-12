/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'package.json');
const lockfilePath = path.join(repoRoot, 'package-lock.json');
const nodeModulesPath = path.join(repoRoot, 'node_modules');
const dependencyFields = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `无法读取有效 JSON：${path.basename(filePath)}（${error.message}）`,
    );
  }
}

function sortedMap(value) {
  return Object.keys(value || {})
    .sort()
    .reduce((result, key) => {
      result[key] = value[key];
      return result;
    }, {});
}

function sameMap(left, right) {
  return JSON.stringify(sortedMap(left)) === JSON.stringify(sortedMap(right));
}

function packageLockEntry(lockfile, packageName) {
  return lockfile.packages[`node_modules/${packageName}`];
}

function installedPackage(packageName) {
  const packageJsonPath = path.join(
    nodeModulesPath,
    packageName,
    'package.json',
  );

  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  return readJson(packageJsonPath);
}

function topLevelPackageNames() {
  const packageNames = [];

  fs.readdirSync(nodeModulesPath, { withFileTypes: true }).forEach((entry) => {
    if (entry.name.startsWith('.')) {
      return;
    }

    if (entry.name.startsWith('@')) {
      const scopePath = path.join(nodeModulesPath, entry.name);
      fs.readdirSync(scopePath, { withFileTypes: true }).forEach(
        (scopedEntry) => {
          if (!scopedEntry.name.startsWith('.')) {
            packageNames.push(`${entry.name}/${scopedEntry.name}`);
          }
        },
      );
      return;
    }

    packageNames.push(entry.name);
  });

  return packageNames;
}

function verify() {
  const manifest = readJson(manifestPath);
  const lockfile = readJson(lockfilePath);
  const errors = [];
  const lockRoot = lockfile.packages && lockfile.packages[''];

  if (!lockRoot) {
    errors.push('package-lock.json 缺少根 package entry（packages[""]）。');
    return errors;
  }

  ['name', 'version'].forEach((field) => {
    if (manifest[field] !== lockfile[field]) {
      errors.push(
        `package.json ${field}=${JSON.stringify(
          manifest[field],
        )} 与 package-lock.json ${field}=${JSON.stringify(
          lockfile[field],
        )} 不一致。`,
      );
    }

    if (manifest[field] !== lockRoot[field]) {
      errors.push(
        `package.json ${field}=${JSON.stringify(
          manifest[field],
        )} 与 package-lock.json 根 entry ${field}=${JSON.stringify(
          lockRoot[field],
        )} 不一致。`,
      );
    }
  });

  dependencyFields.forEach((field) => {
    if (!sameMap(manifest[field], lockRoot[field])) {
      errors.push(
        `${field} 与 package-lock.json 根 entry 不一致；请使用 npm ci --legacy-peer-deps 验证或重新生成锁文件。`,
      );
    }
  });

  const expectedPackages = new Set();
  ['dependencies', 'devDependencies', 'optionalDependencies'].forEach(
    (field) => {
      Object.keys(manifest[field] || {}).forEach((packageName) => {
        expectedPackages.add(packageName);
      });
    },
  );

  if (!fs.existsSync(nodeModulesPath)) {
    errors.push('node_modules 不存在；请先运行 npm ci --legacy-peer-deps。');
    return errors;
  }

  expectedPackages.forEach((packageName) => {
    const lockEntry = packageLockEntry(lockfile, packageName);
    const installed = installedPackage(packageName);

    if (!lockEntry) {
      errors.push(`package-lock.json 缺少顶层依赖 ${packageName}。`);
      return;
    }

    if (!installed) {
      errors.push(`node_modules 缺少顶层依赖 ${packageName}。`);
      return;
    }

    if (
      lockEntry.version &&
      installed.version &&
      lockEntry.version !== installed.version
    ) {
      errors.push(
        `${packageName} 版本漂移：锁文件为 ${lockEntry.version}，已安装为 ${installed.version}。`,
      );
    }
  });

  topLevelPackageNames()
    .filter((packageName) => !expectedPackages.has(packageName))
    .sort()
    .forEach((packageName) => {
      const lockEntry = packageLockEntry(lockfile, packageName);
      const installed = installedPackage(packageName);

      if (!lockEntry) {
        errors.push(
          `node_modules 存在未声明且不在锁文件中的顶层依赖 ${packageName}。`,
        );
        return;
      }

      if (!installed) {
        errors.push(`node_modules 顶层依赖 ${packageName} 缺少 package.json。`);
        return;
      }

      if (
        lockEntry.version &&
        installed.version &&
        lockEntry.version !== installed.version
      ) {
        errors.push(
          `${packageName} 版本漂移：锁文件为 ${lockEntry.version}，已安装为 ${installed.version}。`,
        );
      }
    });

  return errors;
}

try {
  const errors = verify();

  if (errors.length > 0) {
    console.error('依赖树校验失败：');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  } else {
    console.log(
      '依赖树校验通过：package.json、package-lock.json 与 node_modules 顶层依赖一致。',
    );
  }
} catch (error) {
  console.error(`依赖树校验失败：${error.message}`);
  process.exitCode = 1;
}

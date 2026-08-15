const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const appRoot = path.resolve(__dirname, '..');
const buildRoot = process.env.BASICS_FAST_BUILD_DIR || 'C:\\basics-fast-build';
const releaseDir = path.join(appRoot, 'release');

const sourceDirs = ['assets', 'src', 'scripts'];
const sourceFiles = ['.env', 'app.config.js', 'app.json', 'index.ts', 'package.json', 'package-lock.json', 'tsconfig.json'];
const excludedDirs = new Set(['node_modules', 'android', 'release', 'dist-test', 'dist-answer-test', '.expo']);

function run(command, args, cwd) {
  const resolvedCommand = process.platform === 'win32' && (command === 'npm' || command === 'npx') ? `${command}.cmd` : command;
  const useShell = process.platform === 'win32' && /\.(bat|cmd)$/i.test(resolvedCommand);
  const result = spawnSync(resolvedCommand, args, { cwd, stdio: 'inherit', shell: useShell });
  if (result.status !== 0) {
    throw new Error(`${resolvedCommand} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removePath(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
  }
}

function copyDir(source, target) {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function copyFreshSources() {
  ensureDir(buildRoot);
  for (const dirName of sourceDirs) {
    const target = path.join(buildRoot, dirName);
    removePath(target);
    copyDir(path.join(appRoot, dirName), target);
  }
  for (const fileName of sourceFiles) {
    fs.copyFileSync(path.join(appRoot, fileName), path.join(buildRoot, fileName));
  }
}

function copyInitialProject() {
  ensureDir(buildRoot);
  copyDir(appRoot, buildRoot);
}

function bumpVersion() {
  const appJsonPath = path.join(appRoot, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const parts = String(appJson.expo.version || '1.0.0').split('.').map((part) => Number(part));
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  appJson.expo.version = parts.join('.');
  appJson.expo.android.versionCode = Number(appJson.expo.android.versionCode || 0) + 1;
  fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`, 'utf8');
  return appJson.expo.version;
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
}

function writeReleaseReadme(apkName, hash) {
  const readme = `BasiCS APK release artifacts

Latest APK: ${apkName}
SHA-256: ${hash}

Previous APKs are kept for comparison only. Share the latest APK unless you need an older build.
Keep signing-backup private. The keystore is required to publish updates signed as the same app.
Do not upload release-signing.properties publicly because it contains keystore passwords.
`;
  fs.writeFileSync(path.join(releaseDir, 'README.txt'), readme, 'utf8');
}

function main() {
  const version = bumpVersion();

  const hasNodeModules = fs.existsSync(path.join(buildRoot, 'node_modules'));
  const hasAndroid = fs.existsSync(path.join(buildRoot, 'android', 'gradlew.bat'));

  if (!hasNodeModules || !hasAndroid) {
    removePath(buildRoot);
    copyInitialProject();
    run('npm', ['ci'], buildRoot);
  } else {
    copyFreshSources();
  }

  run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], buildRoot);

  const androidDir = path.join(buildRoot, 'android');
  const gradleCommand = path.join(androidDir, 'gradlew.bat');
  run(gradleCommand, ['assembleRelease'], androidDir);

  ensureDir(releaseDir);
  const apkName = `basics-${version}-fast.apk`;
  const apkSource = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  const apkTarget = path.join(releaseDir, apkName);
  fs.copyFileSync(apkSource, apkTarget);

  const hash = sha256(apkTarget);
  writeReleaseReadme(apkName, hash);

  console.log('');
  console.log(`Built ${apkTarget}`);
  console.log(`SHA-256 ${hash}`);
  console.log(`Kept fast build cache at ${buildRoot}`);
}

main();

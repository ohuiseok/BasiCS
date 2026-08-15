const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const appRoot = path.resolve(__dirname, '..');
const buildRoot = process.env.BASICS_BUILD_DIR || `C:\\basics-apk-build-${Date.now()}`;
const releaseDir = path.join(appRoot, 'release');
const excludedDirs = new Set(['node_modules', 'android', 'release', 'dist-test', 'dist-answer-test', '.expo']);

function run(command, args, cwd) {
  const resolvedCommand =
    process.platform === 'win32' && (command === 'npm' || command === 'npx') ? `${command}.cmd` : command;
  const useShell = process.platform === 'win32' && /\.(bat|cmd)$/i.test(resolvedCommand);
  const result = spawnSync(resolvedCommand, args, {
    cwd,
    stdio: 'inherit',
    shell: useShell,
  });
  if (result.status !== 0) {
    throw new Error(`${resolvedCommand} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function tryRun(command, args, cwd) {
  try {
    run(command, args, cwd);
  } catch {
    // Best-effort cleanup commands should not make a successful APK build fail.
  }
}

function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyProject(source, target) {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyProject(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
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

  removeDir(buildRoot);
  copyProject(appRoot, buildRoot);

  run('npm', ['ci'], buildRoot);
  run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], buildRoot);
  const gradleCommand = path.join(buildRoot, 'android', 'gradlew.bat');
  const androidDir = path.join(buildRoot, 'android');
  run(gradleCommand, ['assembleRelease'], androidDir);

  ensureDir(releaseDir);
  const apkName = `basics-${version}-content.apk`;
  const apkSource = path.join(buildRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  const apkTarget = path.join(releaseDir, apkName);
  fs.copyFileSync(apkSource, apkTarget);

  const hash = sha256(apkTarget);
  writeReleaseReadme(apkName, hash);
  tryRun(gradleCommand, ['--stop'], androidDir);
  try {
    removeDir(buildRoot);
  } catch (error) {
    console.warn(`Could not remove temporary build directory: ${buildRoot}`);
    console.warn(error.message);
  }

  console.log('');
  console.log(`Built ${apkTarget}`);
  console.log(`SHA-256 ${hash}`);
}

main();

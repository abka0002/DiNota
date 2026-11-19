// Builds DiNota for Windows, macOS and Linux and writes ready-to-share files to dist/release/.
//   Windows  DiNota-<v>-windows-x64.exe      one portable file, resources embedded
//   macOS    DiNota-<v>-macos-universal.zip  DiNota.app (Intel + Apple Silicon)
//   Linux    DiNota-<v>-linux-<arch>.zip     binary + icon + install.sh (menu entry, "Open with")
// Runs on any OS: file modes are written into the zip entries, so a build made on Windows still
// unpacks as executable on macOS and Linux.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync, createWriteStream, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yazl = require('yazl');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const run = (args) => execFileSync(process.execPath, [require.resolve('@neutralinojs/neu/bin/neu.js'), ...args], { stdio: 'inherit' });
execFileSync(process.execPath, [join(root, 'scripts', 'prepare.mjs')], { stdio: 'inherit' });
if (!existsSync('bin') || !existsSync('resources/js/neutralino.js')) run(['update']);

const cfg = JSON.parse(readFileSync('neutralino.config.json', 'utf8'));
const name = cfg.cli.binaryName, v = cfg.version, build = join('dist', name), out = join('dist', 'release');
rmSync('dist', { recursive: true, force: true });

const zip = (file, entries) => new Promise((resolve, reject) => {
  const z = new yazl.ZipFile();
  for (const e of entries) {
    const opt = { mode: e.exec ? 0o100755 : 0o100644, mtime: new Date() };
    if (e.data !== undefined) z.addBuffer(Buffer.from(e.data), e.as, opt); else z.addFile(e.from, e.as, opt);
  }
  z.outputStream.pipe(createWriteStream(file)).on('close', resolve).on('error', reject);
  z.end();
});

// 1) Windows and Linux: resources embedded in the binary, so each is a single file.
run(['build', '--embed-resources']);
mkdirSync(out, { recursive: true });
copyFileSync(join(build, `${name}-win_x64.exe`), join(out, `${name}-${v}-windows-x64.exe`));

const desktopInstall = `#!/bin/sh
# Installs DiNota for the current user: program, icon, menu entry and "Open with" for PDF files.
set -e
here="$(cd "$(dirname "$0")" && pwd)"
app="$HOME/.local/share/dinota"
mkdir -p "$app" "$HOME/.local/share/applications" "$HOME/.local/share/icons/hicolor/256x256/apps"
cp "$here/DiNota" "$app/DiNota" && chmod +x "$app/DiNota"
cp "$here/dinota.png" "$HOME/.local/share/icons/hicolor/256x256/apps/dinota.png"
cat > "$HOME/.local/share/applications/dinota.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=DiNota
Comment=Annotate PDF files
Exec="$app/DiNota" %F
Icon=dinota
Terminal=false
Categories=Office;Viewer;Education;
MimeType=application/pdf;
StartupWMClass=DiNota
EOF
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
echo "DiNota is installed. Find it in your applications menu, or run: $app/DiNota"
`;
const linuxReadme = `DiNota ${v} for Linux

Run ./DiNota directly, or run ./install.sh once to add DiNota to the applications menu
and to "Open with" for PDF files.

DiNota uses the system web view. If it does not start, install WebKitGTK:
  Debian/Ubuntu:  sudo apt install libwebkit2gtk-4.1-0
  Fedora:         sudo dnf install webkit2gtk4.1
  Arch:           sudo pacman -S webkit2gtk-4.1
`;
for (const arch of ['x64', 'arm64']) {
  const bin = join(build, `${name}-linux_${arch}`);
  if (!existsSync(bin)) continue;
  await zip(join(out, `${name}-${v}-linux-${arch}.zip`), [
    { from: bin, as: `DiNota-${v}-linux-${arch}/DiNota`, exec: true },
    { from: 'assets/icon-256.png', as: `DiNota-${v}-linux-${arch}/dinota.png` },
    { data: desktopInstall, as: `DiNota-${v}-linux-${arch}/install.sh`, exec: true },
    { data: linuxReadme, as: `DiNota-${v}-linux-${arch}/README.txt` },
  ]);
}

// 2) macOS: a real .app bundle. Resources stay beside the binary (embedding would break its code signature).
run(['build']);
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>${name}</string>
  <key>CFBundleDisplayName</key><string>${name}</string>
  <key>CFBundleIdentifier</key><string>${cfg.applicationId}</string>
  <key>CFBundleExecutable</key><string>${name}</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${v}</string>
  <key>CFBundleVersion</key><string>${v}</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>LSMinimumSystemVersion</key><string>10.13</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.productivity</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>${cfg.copyright}</string>
</dict></plist>
`;
const macBin = join(build, `${name}-mac_universal`);
if (existsSync(macBin)) {
  const app = `${name}.app/Contents`;
  await zip(join(out, `${name}-${v}-macos-universal.zip`), [
    { data: plist, as: `${app}/Info.plist` },
    { data: 'APPL????', as: `${app}/PkgInfo` },
    { from: macBin, as: `${app}/MacOS/${name}`, exec: true },
    { from: join(build, 'resources.neu'), as: `${app}/MacOS/resources.neu` },
    { from: 'assets/icon.icns', as: `${app}/Resources/icon.icns` },
  ]);
}

console.log('\nRelease files:');
for (const f of require('node:fs').readdirSync(out)) console.log(`  dist/release/${f}  ${(statSync(join(out, f)).size / 1048576).toFixed(1)} MB`);

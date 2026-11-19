# DiNota Desktop

DiNota is a free PDF annotator: highlight, write, comment, stamp, draw and present. Everything runs on your own computer and nothing is uploaded.

This repository turns the single-file web app (`src/DiNota.html`) into a desktop application for Windows, macOS and Linux, using a small [Neutralinojs](https://neutralino.js.org) shell around the system web view.

© 2026 [Dr. Kawther Aboalam](https://www.linkedin.com/in/kawther-aboalam-b7102a1a/) & AI Agents

## What the desktop app adds

- Native "Save as" dialogs for PDFs and exports
- "Open with DiNota": PDFs passed on the command line open as tabs
- Quit (Ctrl+Q) and Close file (Ctrl+W); closing the window waits for the autosave
- Printing through the system PDF viewer; links open in the system browser
- Window size and position are remembered; annotations and the recent list persist between launches

## Build

Requires [Node.js](https://nodejs.org) 20 or newer. Works the same on Windows, macOS and Linux.

```
npm install
npm run setup     # once: downloads the Neutralinojs runtime (about 20 MB)
npm run build
```

`dist/release/` then holds:

| File | Platform | How to use |
|---|---|---|
| `DiNota-<version>-windows-x64.exe` | Windows 10/11 | One portable file. Double-click to run. |
| `DiNota-<version>-macos-universal.zip` | macOS 10.13+, Intel and Apple Silicon | Unzip, move `DiNota.app` to Applications. |
| `DiNota-<version>-linux-x64.zip`, `-arm64.zip` | Linux | Unzip, run `./DiNota`, or `./install.sh` for a menu entry. |

To try the app without packaging it: `npm run dev`.

### Releases through GitHub

Pushing a tag builds all platforms on GitHub Actions and attaches the files to a draft release:

```
git tag v1.4.0
git push origin v1.4.0
```

## Updating DiNota

Replace `src/DiNota.html` with the new version and run `npm run build`. The version number is read from `APP_VERSION` in the HTML. Nothing else needs editing: `scripts/prepare.mjs` only adds the two lines that load the Neutralinojs client, and DiNota's own `NATIVE()` checks do the rest.

## Layout

```
src/DiNota.html          the app (single file, works in a browser as it is)
assets/                  app icon (svg, png, icns)
neutralino.config.json   window, permissions, runtime version
scripts/prepare.mjs      src/DiNota.html -> resources/index.html
scripts/package.mjs      builds and packages all platforms
.github/workflows/       release build on tags
```

## Good to know

- **Unsigned builds.** Windows SmartScreen shows "Windows protected your PC" (More info → Run anyway). macOS refuses the first launch; right-click the app → Open, or run `xattr -cr DiNota.app`. Removing these warnings needs a Windows code-signing certificate and an Apple Developer ID with notarisation.
- **One window at a time.** The app serves itself on a fixed local port (47613) so that saved annotations survive a restart. Starting DiNota a second time while it is running does nothing.
- **Web view.** Windows uses WebView2 (part of Windows 10/11), macOS uses WKWebView, Linux needs WebKitGTK (`libwebkit2gtk-4.1`).
- **Permissions.** The shell may only show save dialogs, read and write the files you choose, open links and files with the system default app, and control its own window. See `nativeAllowList` in `neutralino.config.json`.

## License

DiNota is free software: you can use, study, share and change it under the terms of the [GNU General Public License, version 3](LICENSE). It comes without any warranty. If you distribute a modified version, you must publish its source under the same license.

Copyright © 2026 Dr. Kawther Aboalam.

The bundled third-party components keep their own licenses; see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

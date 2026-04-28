# Release Signing & Auto-Update

Runway ships as a Tauri-bundled Windows app. To distribute updates
safely, two separate signing flows matter:

1. **Tauri updater signing** proves an update artifact came from the
   Runway release key. This is configured.
2. **Windows Authenticode signing** proves the installer/executable was
   published by a trusted Windows code-signing identity. This is optional
   for Runway's current distribution model because it requires a paid
   certificate or a third-party open-source signing program.

This file documents the release setup and the remaining hand-off.

## 1. Tauri update signing key (configured)

The Tauri updater verifies every downloaded artifact against an
embedded ed25519 public key. Without it, installs cannot safely receive
in-app updates.

```powershell
npx tauri signer generate -w "$env:USERPROFILE\.tauri\runway.key"
```

The current public key is already embedded at
`src-tauri/tauri.conf.json -> plugins.updater.pubkey`. The private key
is expected at `%USERPROFILE%\.tauri\runway.key` for local release
builds and must stay outside the repo.

For CI or another release machine, load the signing material via:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\runway.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<key password>"
```

When `tauri build` runs with those env vars present, the updater
artifacts and their `.sig` files are produced alongside the regular
installer. Upload the installer, updater artifacts, signatures, and a
`latest.json` manifest to the GitHub Release.

## 2. Authenticode signing (optional)

Without Authenticode, every install triggers SmartScreen
"unrecognized publisher" warnings even if the Tauri updater artifacts
are signed. That warning is acceptable for internal/manual installs as
long as the release notes clearly state that the build is unsigned.

If Runway later needs verified-publisher UX, use one of these paths:

- **EV cert** — best UX, no SmartScreen reputation warm-up. Required
  for enterprise distribution. Cost: ~$300/year, vendor-bound to a
  hardware token.
- **Standard code-signing cert** — works, but SmartScreen still warns
  for ~30 days while Microsoft builds reputation.
- **Open-source signing program** — apply to a free program such as
  SignPath Foundation if the project qualifies.

Once you have a cert, set `bundle.windows.signCommand` in
`tauri.conf.json` to the `signtool` invocation, e.g.:

```json
"signCommand": "signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a %1"
```

Or use `azuresigntool` if you stored the cert in Azure Key Vault.

Current status: `bundle.windows.signCommand` is intentionally `null`.
Runway can ship unsigned Windows installers with the expected warning.

## 3. `latest.json` shape

The updater polls the URL listed in
`tauri.conf.json → plugins.updater.endpoints` and expects:

```json
{
  "version": "1.0.0",
  "notes": "Release notes shown in the in-app updater dialog.",
  "pub_date": "2026-04-27T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "<contents of *.msi.zip.sig>",
      "url": "https://github.com/giftedloser/Runway/releases/download/v1.0.0/Runway_1.0.0_x64_en-US.msi.zip"
    }
  }
}
```

Build this file in CI from the artifacts and upload it as the
release's `latest.json` asset.

## 4. CI hand-off (todo)

A GitHub Actions workflow at `.github/workflows/release.yml` (not yet
authored) should:

1. Run `npm ci`.
2. Run `npm run check`.
3. Run `npm run build:desktop-runtime`.
4. Run `npm run tauri:build` with the two `TAURI_SIGNING_*` secrets
   exported.
5. Upload the installer, updater artifact(s), `.sig` files, and a generated
   `latest.json` to the release named after the tag.

Until that workflow exists, releases are produced locally with the
same env vars set in the developer's shell.

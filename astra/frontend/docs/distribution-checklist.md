# Astra AI — Distribution Checklist

**Phase 4 — Milestone 6 (Release Engineering)**

Use this checklist before shipping any public release.

---

## Pre-Release

- [ ] Version bumped in `package.json` (single source of truth).
- [ ] `CHANGELOG.md` updated for the release.
- [ ] `npm run release:metadata` generates correct metadata.
- [ ] `npm run smoke` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.
- [ ] No new untracked temp files in `scripts/`.

## Build

- [ ] Tag pushed: `git tag vX.Y.Z && git push origin vX.Y.Z`.
- [ ] CI `validate.yml` is green on the tag commit.
- [ ] CI `package.yml` produced installers for all three OSes.
- [ ] CI `release.yml` drafted a GitHub release with artifacts attached.

## Installer Verification (per platform)

- [ ] Windows: NSIS installs, uninstalls, creates shortcuts, upgrades in place.
- [ ] Windows: Portable build runs (if published).
- [ ] macOS: DMG mounts, app opens, no corrupted bundle.
- [ ] Linux: AppImage runs (`chmod +x`).
- [ ] Linux: DEB installs/removes cleanly.
- [ ] File associations registered per platform.
- [ ] Launch-on-startup works.

## Application Smoke (per platform)

- [ ] Splash → onboarding → main UI.
- [ ] Backend connects; Chat page is NOT stuck offline.
- [ ] OfflineState + Retry works.
- [ ] No console errors.
- [ ] No React warnings.
- [ ] Memory/Files/Models/Plugins pages load.

## Auto-Update

- [ ] `latest.yml` (win), `latest-mac.yml` (mac), `latest-linux.yml` (linux)
      published next to installers.
- [ ] Check for updates finds the new version.
- [ ] Download + install + relaunch works.
- [ ] Beta channel publishes to a `beta` feed if used.

## Signing (when certificates available)

- [ ] Windows binaries Authenticode-signed.
- [ ] macOS app signed + notarized (Gatekeeper-clean).
- [ ] Signed binaries verified (`osslsigncode verify` / `codesign --verify`).

## Release Notes

- [ ] Release notes drafted from `docs/release-notes-template.md`.
- [ ] Known issues listed with workarounds.
- [ ] Checksums (SHA-256) posted for each artifact.

## Post-Release

- [ ] Draft release published.
- [ ] Tag + changelog synchronized.
- [ ] Environment limitations updated in `docs/environment-limitations.md`.
- [ ] `docs/cross-platform-validation.md` filled with actual test results.

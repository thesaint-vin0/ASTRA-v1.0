/**
 * macOS Notarization hook — called by electron-builder after the app bundle
 * has been signed (`afterSign`).
 *
 * This hook is ENVIRONMENT-GATED. It only runs when the three required
 * environment variables are present:
 *
 *   APPLE_ID                     — Apple Developer account email
 *   APPLE_APP_SPECIFIC_PASSWORD  — App-specific password (not the account password)
 *   APPLE_TEAM_ID                — Developer Team ID (10-char uppercase)
 *
 * If any variable is missing the hook logs a warning and exits successfully so
 * local/CI builds that do not have signing credentials still complete. Real
 * notarization runs only in the release pipeline where secrets are configured.
 *
 * Uses @electron/notarize (bundled helper) — kept as a direct devDependency
 * entry so electron-builder can resolve it during packaging.
 */
const { execFile } = require('node:child_process')

// Detect whether we have notarization credentials.
function hasNotarizationCredentials() {
  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env
  return !!(APPLE_ID && APPLE_APP_SPECIFIC_PASSWORD && APPLE_TEAM_ID)
}

module.exports = async function notarizeMacos(context) {
  if (process.platform !== 'darwin') return

  const { electronPlatformName, appOutDir, packager } = context
  if (electronPlatformName !== 'darwin') return

  if (!hasNotarizationCredentials()) {
    console.log(
      '[notarize] Skipping notarization — APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not set. ' +
        'Unsigned or ad-hoc build produced. Configure secrets in the release workflow to enable notarization.'
    )
    return
  }

  const appName = packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`

  console.log(`[notarize] Notarizing ${appPath} ...`)

  // @electron/notarize ships with electron-builder as a transitive dependency.
  // Use npx to guarantee it is resolvable without adding a fragile require path.
  await new Promise((resolve, reject) => {
    execFile(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      [
        '--no-install',
        '@electron/notarize',
        '--',
        '--appPath',
        appPath,
        '--appleId',
        process.env.APPLE_ID,
        '--appleIdPassword',
        process.env.APPLE_APP_SPECIFIC_PASSWORD,
        '--teamId',
        process.env.APPLE_TEAM_ID,
      ],
      { env: process.env, stdio: 'inherit' },
      (error) => (error ? reject(error) : resolve())
    )
  })

  console.log('[notarize] Notarization completed successfully')
}


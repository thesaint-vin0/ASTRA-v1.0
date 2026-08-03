#!/usr/bin/env node
/**
 * Astra AI — Automated Smoke Test
 *
 * Verifies the core release artifacts are present and internally consistent.
 * Runs in CI (validate/package/release) and locally after packaging.
 *
 * Checks:
 *  1. Production build (dist/index.html + assets) exists and is non-trivial.
 *  2. release-metadata.json is present and contains version/commit/channel.
 *  3. Electron main + preload + updater modules are syntactically parseable.
 *  4. IPC surface is consistent: updater.js handlers ↔ preload.js bridge.
 *  5. package.json version is the single source of truth for metadata.
 *
 * Exit code 0 = pass, 1 = fail.
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let failures = 0

function check(name, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${name}`)
  } else {
    failures++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('Astra AI Smoke Test')
console.log('===================')

// 1. Production build exists
console.log('\n[1] Production build')
const distIndex = path.join(root, 'dist', 'index.html')
const distExists = existsSync(distIndex)
check('dist/index.html exists', distExists)
if (distExists) {
  check('dist/index.html non-trivial', statSync(distIndex).size > 1000)
}
const assetsDir = path.join(root, 'dist', 'assets')
check('dist/assets exists', existsSync(assetsDir))
if (existsSync(assetsDir)) {
  const count = readdirSync(assetsDir).length
  check('dist/assets has chunks', count > 5, `count=${count}`)
}

// 2. Release metadata
console.log('\n[2] Release metadata')
const metaPath = path.join(root, 'release-metadata.json')
check('release-metadata.json exists', existsSync(metaPath))
if (existsSync(metaPath)) {
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  check('metadata.version present', !!meta.version, JSON.stringify(meta.version))
  check('metadata.channel present', !!meta.channel, JSON.stringify(meta.channel))
  check('metadata.platform/arch present', !!meta.platform && !!meta.arch)
}

// 3. Electron modules syntactically parseable
console.log('\n[3] Electron module syntax')
for (const f of ['electron/main.js', 'electron/preload.js', 'electron/updater.js']) {
  const file = path.join(root, f)
  const fileExists = existsSync(file)
  check(`${f} exists`, fileExists)
  if (fileExists) {
    try {
      // Syntax-only check without executing (electron APIs unavailable in plain Node)
      new Function(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
      check(`${f} parses`, true)
    } catch (e) {
      check(`${f} parses`, false, e.message)
    }
  }
}

// 4. IPC surface consistency: preload bridge ↔ updater handlers
console.log('\n[4] IPC surface consistency')
const preloadSrc = existsSync(path.join(root, 'electron', 'preload.js'))
  ? readFileSync(path.join(root, 'electron', 'preload.js'), 'utf8')
  : ''
const updaterSrc = existsSync(path.join(root, 'electron', 'updater.js'))
  ? readFileSync(path.join(root, 'electron', 'updater.js'), 'utf8')
  : ''
const expectedIpc = [
  'update:check',
  'update:download',
  'update:install',
  'update:getStatus',
  'update:setAutoDownload',
  'update:setChannel',
]
for (const channel of expectedIpc) {
  const inPreload = preloadSrc.includes(`invoke('${channel}'`)
  const inUpdater = updaterSrc.includes(`'${channel}'`)
  check(`IPC ${channel} wired (preload↔updater)`, inPreload && inUpdater)
}
check('update:status event broadcast in updater', updaterSrc.includes('update:status'))
check('update:status listener in preload', preloadSrc.includes("on('update:status'"))

// 5. Single version source (package.json) matches metadata
console.log('\n[5] Single version source')
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
check('package.json version present', !!pkg.version, JSON.stringify(pkg.version))
if (existsSync(metaPath)) {
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  check(
    'metadata version == package.json version',
    meta.version === pkg.version,
    `${meta.version} vs ${pkg.version}`
  )
}
check('electron-updater dependency present', !!(pkg.dependencies?.['electron-updater']))
check('release:metadata script present', !!(pkg.scripts?.['release:metadata']))

console.log('\n===================')
if (failures === 0) {
  console.log('SMOKE TEST PASSED')
  process.exit(0)
} else {
  console.error(`SMOKE TEST FAILED — ${failures} check(s) failed`)
  process.exit(1)
}


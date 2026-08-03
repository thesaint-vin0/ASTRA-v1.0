#!/usr/bin/env node
/**
 * Astra AI — Release Metadata Generator
 *
 * Generates a machine-readable release metadata JSON file containing:
 *   - version          (single source of truth: package.json)
 *   - commit           (short git commit hash, if available)
 *   - buildDate        (UTC ISO timestamp of the build)
 *   - channel          (stable / beta — derived from the version suffix)
 *   - platform / arch  (process.platform / process.arch)
 *   - electron / node / chrome versions (when running under Electron)
 *
 * Usage:
 *   node scripts/generate-release-metadata.js [--out <path>]
 *
 * The default output path is `./release-metadata.json` at the frontend root.
 * CI pipelines can post-process this file, attach it to releases, or use it
 * for update channel routing.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

function getGitCommit(short = true) {
  try {
    const args = ['rev-parse', short ? '--short' : '', 'HEAD'].filter(Boolean)
    return execFileSync('git', args, { encoding: 'utf8', cwd: process.cwd() }).trim()
  } catch {
    return process.env.GITHUB_SHA ? (short ? process.env.GITHUB_SHA.slice(0, 7) : process.env.GITHUB_SHA) : 'unknown'
  }
}

function getChannel(version) {
  return /-(alpha|beta|rc|dev)/i.test(version) ? 'beta' : 'stable'
}

function main() {
  const args = process.argv.slice(2)
  const outIdx = args.indexOf('--out')
  const outPath = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : null

  const pkgPath = path.resolve(process.cwd(), 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

  const version = pkg.version || '0.0.0'
  const metadata = {
    appId: pkg.build?.appId || 'dev.astra.ai',
    projectName: pkg.name || 'astra-ai',
    productName: pkg.build?.productName || pkg.productName || pkg.name || 'Astra AI',
    version,
    channel: getChannel(version),
    commit: getGitCommit(true),
    buildDate: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    environment: {
      node: process.versions.node,
      electron: process.versions.electron || null,
      chrome: process.versions.chrome || null,
    },
    // GitHub context when running inside Actions
    github: process.env.GITHUB_SHA
      ? {
          sha: process.env.GITHUB_SHA,
          ref: process.env.GITHUB_REF || null,
          runNumber: process.env.GITHUB_RUN_NUMBER || null,
          repository: process.env.GITHUB_REPOSITORY || null,
        }
      : null,
    generatedBy: 'scripts/generate-release-metadata.js',
  }

  const target = outPath
    ? path.resolve(process.cwd(), outPath)
    : path.resolve(process.cwd(), 'release-metadata.json')

  fs.writeFileSync(target, JSON.stringify(metadata, null, 2))
  console.log(`[release-metadata] Written ${target}`)
  console.log(`[release-metadata] ${metadata.productName} v${metadata.version} (${metadata.channel}) @ ${metadata.commit} [${metadata.platform}/${metadata.arch}]`)
}

main()


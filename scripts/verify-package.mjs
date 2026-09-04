import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const REQUIRED_FILES = ['LICENSE', 'README.md', 'dist/index.js', 'package.json']

export function validatePackageFiles(files) {
  if (!Array.isArray(files) || files.length !== REQUIRED_FILES.length) {
    throw new Error('Release must contain exactly the four approved files')
  }
  const paths = files.map(file => file.path)
  for (const expected of REQUIRED_FILES) {
    if (paths.filter(path => path === expected).length !== 1) {
      throw new Error('Missing or duplicate release file: ' + expected)
    }
  }
  if (files.some(file => !Number.isFinite(file.size) || file.size <= 0)) {
    throw new Error('Release contains an empty or invalid file')
  }
}

function main() {
  const cwd = fileURLToPath(new URL('../', import.meta.url))
  const npmCli = process.env.npm_execpath
  if (!npmCli) throw new Error('Run with npm run verify:package')
  // Ignore lifecycle hooks here: prepublishOnly invokes this check, and the
  // build has already run. This avoids a recursive prepack verification.
  const output = execFileSync(process.execPath, [
    npmCli, 'pack', '--dry-run', '--json', '--ignore-scripts',
  ], { cwd, encoding: 'utf8' })
  const packs = JSON.parse(output)
  if (packs.length !== 1) throw new Error('Expected one release package')
  validatePackageFiles(packs[0].files)
  const manifest = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8'))
  if (manifest.name !== 'switchwize-mcp' || manifest.bin?.['switchwize-mcp'] !== './dist/index.js') {
    throw new Error('Unexpected package identity or executable')
  }
  const executable = readFileSync(resolve(cwd, 'dist/index.js'), 'utf8')
  if (!executable.startsWith('#!/usr/bin/env node')) throw new Error('Missing executable shebang')
  console.log(JSON.stringify({
    package: packs[0].id, files: packs[0].files.map(file => file.path),
    bytes: packs[0].size, integrity: packs[0].integrity, published: false,
  }, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
}

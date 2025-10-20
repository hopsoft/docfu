import {mkdir, copyFile, writeFile} from 'fs/promises'
import {join, dirname} from 'path'
import {mkdtempSync, rmSync} from 'fs'
import {tmpdir} from 'os'
import {execSync} from 'child_process'
import bus from '../lib/bus.js'
import manifest from '../lib/manifest.js'

export const megabytes = base => base * 1024 * 1024

export const copyFixtures = async (source, fixtures) => {
  for (const [path, fixture] of Object.entries(fixtures)) {
    const dest = join(source, path)
    await mkdir(dirname(dest), {recursive: true})
    await copyFile(fixture, dest)
  }
}

export const createFixtures = async (source, fixtures) => {
  for (const [path, content] of Object.entries(fixtures)) {
    const dest = join(source, path)
    await mkdir(dirname(dest), {recursive: true})
    await writeFile(dest, content)
  }
}

export const isolate = async callback => {
  const dir = mkdtempSync(join(tmpdir(), 'docfu-test-'))
  const source = join(dir, 'source')

  try {
    await callback(source)
  } finally {
    bus.clear()
    manifest.reset()
    rmSync(dir, {recursive: true, force: true})
  }
}

export const x = cmd => execSync(cmd, {stdio: 'inherit', env: {...process.env, FORCE_COLOR: '1'}})

import {mkdir, copyFile, writeFile} from 'fs/promises'
import {join, dirname} from 'path'
import {mkdtempSync, rmSync} from 'fs'
import {tmpdir} from 'os'

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
    rmSync(dir, {recursive: true, force: true})
  }
}

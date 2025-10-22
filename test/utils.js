import {basename, dirname, join, mkdir, rm, write} from '../lib/file-system.js'
import {system} from '../lib/system.js'
import manifest from '../lib/manifest.js'
import pkgmgr from '../lib/package-manager.js'

function createFixtures(testdir, fixtures) {
  for (const [path, content] of Object.entries(fixtures)) {
    write(join(testdir, path), content)
  }
}

function quarantine(testCase, callback) {
  if (!__dirname || !testCase) throw new Error('Missing __dirname or testCase!')

  const testdir = mkdir(
    dirname(__dirname),
    'tmp',
    `${dirname(testCase.file.name)}-${pkgmgr.name}`,
    basename(testCase.file.name, '.test.js'),
    testCase.id
  )

  try {
    manifest.reset()
    callback(testdir)
  } finally {
    rm(testdir)
  }
}

function spawn(...args) {
  system(args.join(' '), {env: {...process.env, FORCE_COLOR: '1'}})
}

export {createFixtures, quarantine, spawn}

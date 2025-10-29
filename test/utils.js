import {Pathname} from '../lib/pathname.js'
import {DocFuConfig} from '../lib/docfu-config.js'
import stage from '../lib/cli/stage.js'
import manifest from '../lib/manifest.js'
import {pm} from '../lib/package-manager.js'

/**
 * Isolates test execution in a temporary directory
 * Creates a unique temp directory per test case and cleans it before use
 * @param {Object} testCase - Vitest test case object with file and id metadata
 * @param {Function} callback - Test function to execute with isolated directory
 * @returns {*} Result from callback function
 */
function quarantine(testCase, callback) {
  if (!__dirname || !testCase) throw new Error('Missing __dirname or testCase!')

  const testDir = new Pathname(__dirname).directory
  const tmpDir = testDir.join('tmp', `${new Pathname(testCase.file.name).directory.basename()}-${pm.name}`)
  const sourceDir = tmpDir.join(`${new Pathname(testCase.file.name).basename('.test.js')}-${testCase.id}`)

  sourceDir.mkdir({overwrite: true})
  return callback(String(sourceDir))
}

/**
 * Creates test fixture files in a directory
 * @param {string} directory - Target directory path
 * @param {Object} fixtures - Map of relative paths to file contents
 * @example
 * createFixtures(source, {
 *   'index.md': '# Home',
 *   'guide.md': '# Guide'
 * })
 */
function createFixtures(directory, fixtures) {
  const dir = new Pathname(directory)
  for (const [path, content] of Object.entries(fixtures)) {
    const file = dir.join(path)
    file.write(content)
  }
}

/**
 * Runs DocFu CLI command and returns DocFuConfig for path access
 * Executes CLI in separate process for test isolation
 * @param {Object} testCase - Vitest test case object
 * @param {string} subCommand - CLI subcommand (e.g., 'stage', 'build', 'preview')
 * @param {string} sourceDirectory - Source directory path
 * @param {string} [sandboxDirectory] - Optional sandbox directory (default: [source]/.docfu)
 * @returns {Promise<DocFuConfig>} DocFuConfig instance with path helpers
 * @example
 * quarantine(task, async source => {
 *   createFixtures(source, {'index.md': '# Home'})
 *   const docfu = await runCLI(task, 'stage', source)
 *   const workspaceDocs = docfu.sandbox.workspace.directory.join('src', 'content', 'docs')
 * })
 */
async function runCLI(testCase, subCommand, sourceDirectory, sandboxDirectory) {
  const options = {unsafe: true}
  if (sandboxDirectory) options.sandbox = sandboxDirectory
  return await stage(sourceDirectory, options)
}

export {createFixtures, quarantine, runCLI}

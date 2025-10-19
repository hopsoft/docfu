import spawn from 'cross-spawn'
import yaml from 'js-yaml'
import {dirname, join, resolve} from 'path'
import {fileURLToPath} from 'url'
import {homedir} from 'os'
import theme from './theme.js'

export function expandTilde(filepath) {
  if (!filepath) return filepath
  if (filepath === '~') return homedir()
  if (filepath.startsWith('~/')) return join(homedir(), filepath.slice(2))
  return filepath
}

export function resolveNodeModules(binaryName, importMetaUrl) {
  const __dirname = dirname(fileURLToPath(importMetaUrl))
  const packageRoot = resolve(__dirname, '../../..')
  const parentNodeModules = resolve(packageRoot, '..')

  // If parent has .bin with our binary, use parent (npm hoisting, npx)
  if (existsSync(join(parentNodeModules, '.bin', binaryName))) return parentNodeModules

  // Default to local node_modules
  return join(packageRoot, 'node_modules')
}

export async function resolveBinary(packageName, importMetaUrl) {
  const __dirname = dirname(fileURLToPath(importMetaUrl))
  const packageRoot = resolve(__dirname, '../../..')
  const nodeModules = resolveNodeModules(packageName, importMetaUrl)

  const binLocations = [join(nodeModules, '.bin', packageName), join(packageRoot, 'node_modules', '.bin', packageName)]

  for (const binaryPath of binLocations) {
    if (existsSync(binaryPath)) {
      return {binaryPath, nodeModulesPath: nodeModules}
    }
  }

  // Binary not found in any location
  throw new Error(
    `Binary '${packageName}' not found\n` +
      `Searched: ${binLocations.join(', ')}\n` +
      `Hint: Ensure ${packageName} is listed in your dependencies and run 'npm install'.`
  )
}

export function loadConfig() {
  const configPath = join(process.cwd(), 'docfu.yml')
  if (!existsSync(configPath)) return null

  try {
    const content = readFileSync(configPath, 'utf-8')
    return yaml.load(content)
  } catch (error) {
    console.error(theme.warning(`⚠ Warning: Could not parse docfu.yml: ${error.message}`))
    return null
  }
}

export function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      env: process.env,
      ...options,
    })

    proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`Command failed with exit code ${code}`))))

    proc.on('error', err => reject(err))
  })
}

export function getResolvedPaths(source, options) {
  const config = loadConfig()

  const sourceDir = expandTilde(source || process.env.DOCFU_SOURCE)
  const rootDir = expandTilde(options.root || config?.root || process.env.DOCFU_ROOT || '.docfu')

  if (!sourceDir) {
    console.error(theme.danger('✗ Error: No source documentation directory specified'))
    console.error(theme.muted('  Provide the path to your markdown documentation'))
    console.error(theme.muted('  Example: docfu prepare ./my-docs'))
    process.exit(1)
  }

  const resolvedRoot = resolve(rootDir)

  return {
    source: resolve(sourceDir),
    root: resolvedRoot,
    workspace: join(resolvedRoot, 'workspace'),
    dist: join(resolvedRoot, 'dist'),
  }
}

export function setEnvVars(paths) {
  process.env.DOCFU_SOURCE = paths.source
  process.env.DOCFU_ROOT = paths.root
}

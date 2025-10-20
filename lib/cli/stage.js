import yaml from 'js-yaml'
import {confirm} from '@inquirer/prompts'
import {deleteSync} from 'del'
import {homedir} from 'os'
import {sep} from 'path'
import {
  basename,
  copyDir,
  copyFile,
  dirname,
  exists,
  join,
  mkdir,
  move,
  read,
  readdir,
  realpath,
  rm,
  walk,
  write,
} from '../file-system.js'
import {draftPackageJSON} from '../package.js'
import {processMarkdown} from '../markdown.js'
import {discoverUserComponents} from '../markdown/components.js'
import {discover, isExcluded, isUnlisted} from '../config.js'
import env from '../env.js'
import bus from '../bus.js'
import manifest from '../manifest.js'
import '../logger.js'

const __file = basename(import.meta.url)

/**
 * Check if path is a critical system directory
 * @param {string} path - Absolute path to check
 * @returns {boolean} True if path is dangerous
 */
function isDangerous(path) {
  const home = homedir()
  const normalized = realpath(path) || path

  const dangerous = [
    '/',
    home,
    join(home, 'Documents'),
    join(home, 'Desktop'),
    join(home, 'Downloads'),
    '/etc',
    '/usr',
    '/bin',
    '/sbin',
    '/var',
    '/Applications',
    '/System',
    '/Library',
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
  ]

  return dangerous.some(dir => normalized === dir)
}

/**
 * Validate paths before deletion
 * @param {string} root - Root directory path
 * @param {string} source - Source directory path
 */
function validatePaths(root, source) {
  if (isDangerous(root)) {
    bus.pub('error', {
      file: __file,
      message: 'Root is a critical system directory',
      root,
      detail: 'Refusing to delete: home, root, Documents, Desktop, or Downloads. Please use a safe subdirectory',
    })
    process.exit(1)
  }

  const normalizedRoot = realpath(root) || root
  const normalizedSource = realpath(source)

  if (normalizedRoot === normalizedSource) {
    bus.pub('error', {
      file: __file,
      message: 'Root cannot be same as source',
      root,
      source,
    })
    process.exit(1)
  }

  if (normalizedSource.startsWith(normalizedRoot + sep)) {
    bus.pub('error', {
      file: __file,
      message: 'Source is inside root (would be deleted)',
      root,
      source,
    })
    process.exit(1)
  }
}

/**
 * Stage workspace for documentation build
 * @param {string} src - Source directory path
 * @param {Object} [options={}] - Staging options
 * @param {string} [options.sandbox] - Sandbox directory path (default: .docfu)
 * @param {boolean} [options.unsafe] - Skip confirmations and safety checks
 * @returns {Promise<Object>} Workspace paths and config
 */
export default async function stage(src, options = {}) {
  env.source = src
  env.sandbox = options.sandbox || '.docfu'
  let val

  validatePaths(env.sandbox, env.source)

  // Clean sandbox if it exists
  if (exists(env.sandbox)) {
    console.log('→ The following will be deleted:')
    console.log('  ', env.sandbox)

    if (!options.unsafe) {
      const confirmed = await confirm({
        message: 'Delete and continue?',
        default: false,
      })

      if (!confirmed) {
        console.log('✗ Cancelled')
        process.exit(0)
      }
    }

    bus.pub('success', {file: __file, deleted: env.sandbox})
    deleteSync([env.sandbox], {
      force: !!options.unsafe,
      followSymbolicLinks: false,
      dot: true,
    })
  }

  // Discover hierarchical configs
  const {master: config, hierarchical: configs} = discover()

  // Display exclude patterns if configured
  if (config.exclude && config.exclude.length > 0) bus.pub('info', {file: __file, excluded: config.exclude})

  // Create sandbox and workspace
  const sandbox = mkdir(env.sandbox)
  const workspace = mkdir(sandbox, 'workspace')

  // Copy base files to workspace
  copyDir(realpath(env.base, 'public'), join(workspace, 'public'))
  copyDir(realpath(env.base, 'src'), join(workspace, 'src'))
  copyFile(realpath(env.base, 'astro.config.mjs'), join(workspace, 'astro.config.mjs'))
  copyFile(realpath(env.base, 'markdoc.config.mjs'), join(workspace, 'markdoc.config.mjs'))
  copyFile(realpath(env.base, 'tsconfig.json'), join(workspace, 'tsconfig.json'))

  // Write merged config to sandbox
  write(join(sandbox, 'config.yml'), yaml.dump(config))

  // Copy user content
  copyDir(env.source, join(workspace, 'src', 'content', 'docs'))

  // Cleanup unwanted files
  const docs = realpath(workspace, 'src', 'content', 'docs')
  const cleanup = [
    ...walk(docs, f => f.endsWith('docfu.yml')),
    ...walk(docs, f => f.includes('.docfu/')),
    ...walk(docs).filter(f => {
      // Map workspace path back to source path for pattern matching
      const rel = f.replace(docs + '/', '')
      const sourcePath = join(env.source, rel)
      return isExcluded(sourcePath, config.exclude)
    }),
  ]
  cleanup.forEach(f => rm(f))

  // Remove empty parent directories
  const cleanedDirs = new Set()
  cleanup.forEach(f => {
    let dir = dirname(f)
    while (dir !== docs && !cleanedDirs.has(dir)) {
      cleanedDirs.add(dir)
      const entries = readdir(dir)
      if (entries?.length) break
      rm(dir)
      cleanedDirs.add(dir)
      dir = dirname(dir)
    }
  })

  // Organize assets
  const assets = config.assets || 'assets'
  val = join(workspace, 'src', 'content', 'docs', assets)
  if (exists(val)) move(val, join(workspace, 'public', assets))

  // Discover and organize components
  const dir = config.components !== undefined && config.components !== null ? config.components : 'components'
  let components = []

  if (dir !== false && dir !== null) {
    val = join(workspace, 'src', 'content', 'docs', dir)
    if (exists(val)) {
      components = discoverUserComponents(val)
      const dest = join(workspace, 'src', 'components')
      copyDir(val, dest)
      rm(val)
      // if (components.length) bus.pub('success', {file: __file, copied: `${components.length} component(s)`})
    }
  }

  // Discover CSS files
  const css = walk(join(workspace, 'public', assets), f => f.endsWith('.css')).map(f => ({
    path: f.replace(join(workspace, 'public'), '').replace(/^\//, ''),
  }))
  // if (css.length) bus.pub('success', {file: __file, copied: `${css.length} CSS file(s)`})

  // Create workspace package.json
  write(join(workspace, 'package.json'), draftPackageJSON(env.base, {name: 'docfu-workspace'}))

  // Initialze manifest
  manifest.init(config)

  // Process markdown files
  await processMarkdown(workspace, {
    source: env.source,
    configs,
    components,
    isExcluded: file => isExcluded(file, config.exclude),
    isUnlisted: file => isUnlisted(file, config.unlisted),
  })

  // Emit component and CSS discovery events
  bus.pub('components:discovered', {directory: dir, items: components})
  bus.pub('css:discovered', {items: css})

  // Write manifest
  manifest.write(join(sandbox, 'manifest.json'))

  bus.pub('success', {file: __file, staged: true})
  return {workspace, config, source: env.source, sandbox: env.sandbox}
}

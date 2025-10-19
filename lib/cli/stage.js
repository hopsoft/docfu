import yaml from 'js-yaml'
import {confirm} from '@inquirer/prompts'
import {deleteSync} from 'del'
import {homedir} from 'os'
import {sep} from 'path'
import {
  copyDir,
  copyFile,
  dirname,
  exists,
  expandTilde,
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
import manifest from '../manifest.js'
import theme from '../theme.js'

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
    console.error(theme.danger('✗ DANGER'), 'Root is a critical system directory:', root)
    console.error(theme.muted('  Refusing to delete: home, root, Documents, Desktop, or Downloads'))
    console.error(theme.muted('  Please use a safe subdirectory'))
    process.exit(1)
  }

  const normalizedRoot = realpath(root) || root
  const normalizedSource = realpath(source)

  if (normalizedRoot === normalizedSource) {
    console.error(theme.danger('✗ DANGER'), 'Root cannot be same as source')
    console.error(theme.muted(`  Root: ${root}`))
    console.error(theme.muted(`  Source: ${source}`))
    process.exit(1)
  }

  if (normalizedSource.startsWith(normalizedRoot + sep)) {
    console.error(theme.danger('✗ DANGER'), 'Source is inside root (would be deleted)')
    console.error(theme.muted(`  Root: ${root}`))
    console.error(theme.muted(`  Source: ${source}`))
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
  env.setSource(expandTilde(src))
  env.setSandbox(options.sandbox || '.docfu')
  let val

  validatePaths(env.sandbox, env.source)

  // Clean sandbox if it exists
  if (exists(env.sandbox)) {
    console.log(theme.danger('→ The following will be deleted:'))
    console.log(` `, theme.warning(env.sandbox))

    if (!options.unsafe) {
      const confirmed = await confirm({
        message: 'Delete and continue?',
        default: false,
      })

      if (!confirmed) {
        console.log(theme.muted('✗ Cancelled'))
        process.exit(0)
      }
    }

    console.info(theme.lead('→ clean'), env.sandbox)
    deleteSync([env.sandbox], {
      force: !!options.unsafe,
      followSymbolicLinks: false,
      dot: true,
    })
  }

  // Discover hierarchical configs
  const {master: config, hierarchical: configs} = discover()

  // Display exclude patterns if configured
  if (config.exclude && config.exclude.length > 0) {
    console.info(theme.lead('→ Exclude patterns:'))
    config.exclude.forEach(pattern => console.info(theme.muted(`  - ${pattern}`)))
  }

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
      if (entries && entries.length === 0) {
        rm(dir)
        cleanedDirs.add(dir)
      } else {
        break
      }
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
      rm(dest) // Remove template components directory first
      move(val, dest)
      if (components.length) console.info(theme.success(`✓ ${components.length} component(s)`))
    }
  }

  // Discover CSS files
  const css = walk(join(workspace, 'public', assets), f => f.endsWith('.css')).map(f => ({
    path: f.replace(join(workspace, 'public'), '').replace(/^\//, ''),
  }))
  if (css.length) console.info(theme.success(`✓ ${css.length} CSS file(s)`))

  // Create workspace package.json
  write(join(workspace, 'package.json'), draftPackageJSON(env.base, {name: 'docfu-workspace'}))

  // Initialize manifest
  manifest.init(config)

  // Process markdown files
  await processMarkdown(workspace, {
    source: env.source,
    configs,
    components,
    isExcluded: file => isExcluded(file, config.exclude),
    isUnlisted: file => isUnlisted(file, config.unlisted),
  })

  // Add components and CSS to manifest
  manifest.setComponents(dir, components)
  manifest.setCss(css)

  // Write manifest
  manifest.write(join(sandbox, 'manifest.json'))

  console.info(theme.success('✓ Staging complete'))
  return {workspace, config, source: env.source, sandbox: env.sandbox}
}

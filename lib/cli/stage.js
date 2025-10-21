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
  isDir,
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
import {draftPackageJSON} from '../packages.js'
import pkgmgr from '../package-manager.js'
import {system} from '../system.js'
import {processMarkdown} from '../markdown.js'
import {discoverUserComponents} from '../markdown/components.js'
import {collectConfigs, isExcluded, isUnlisted} from '../config.js'
import base from '../base.js'
import bus from '../bus.js'
import manifest from '../manifest.js'
import theme from '../theme.js'

const __file = basename(import.meta.url)

/**
 * Stage workspace for documentation build
 * @param {string} source - Source directory path
 * @param {Object} [options={}] - Staging options
 * @param {string} [options.sandbox] - Sandbox directory path (default: .docfu)
 * @param {boolean} [options.unsafe] - Skip confirmations and safety checks
 * @returns {Promise<Object>} Workspace paths and config
 */
export default async function stage(source, options = {}) {
  base.source = source
  base.sandbox = options.sandbox

  // Clean sandbox if it exists
  if (exists(base.sandbox)) {
    if (!options.unsafe) {
      console.warn(theme.warning('→ The following directory will be deleted:'))
      console.warn('  ', theme.symbolic(base.sandbox))

      const confirmed = await confirm({
        message: 'Delete and continue?',
        default: false,
      })

      if (!confirmed) {
        console.info(theme.tertiary('✗ Cancelled'))
        process.exit(0)
      }
    }

    rm(base.sandbox)
  }

  // Collect hierarchical configs
  const {master: config, hierarchical: configs} = collectConfigs()

  // Display exclude patterns if configured
  if (config.exclude?.length) {
    console.info(theme.tertiary(`→ Excluding ${config.exclude.length} pattern(s)`))
  }

  // Create sandbox and workspace
  const sandbox = mkdir(base.sandbox)
  const workspace = mkdir(sandbox, 'workspace')

  // Copy base files to workspace
  copyDir(realpath(base.dir, 'public'), join(workspace, 'public'))
  copyDir(realpath(base.dir, 'src'), join(workspace, 'src'))
  copyFile(realpath(base.dir, 'astro.config.mjs'), join(workspace, 'astro.config.mjs'))
  copyFile(realpath(base.dir, 'markdoc.config.mjs'), join(workspace, 'markdoc.config.mjs'))
  copyFile(realpath(base.dir, 'tsconfig.json'), join(workspace, 'tsconfig.json'))

  // Write merged config to sandbox
  write(join(sandbox, 'config.yml'), yaml.dump(config))

  // Copy user content (excluding sandbox to avoid copying directory into subdirectory of self)
  const contentDest = join(workspace, 'src', 'content', 'docs')
  mkdir(contentDest)
  readdir(base.source)?.forEach(entry => {
    const srcPath = join(base.source, entry)
    if (srcPath === base.sandbox) return
    const destPath = join(contentDest, entry)
    if (isDir(srcPath)) copyDir(srcPath, destPath)
    else copyFile(srcPath, destPath)
  })

  // Cleanup unwanted files
  const docs = realpath(workspace, 'src', 'content', 'docs')
  const cleanup = [
    ...walk(docs, f => f.endsWith('docfu.yml')),
    ...walk(docs).filter(f => {
      // Map workspace path back to source path for pattern matching
      const rel = f.replace(docs + '/', '')
      const sourcePath = join(base.source, rel)
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
  let val = join(workspace, 'src', 'content', 'docs', assets)
  if (exists(val)) move(val, join(workspace, 'public', assets))

  // Discover and organize components
  const dir = config.components ?? 'components'
  let components = []

  if (dir !== false && dir !== null) {
    val = join(workspace, 'src', 'content', 'docs', dir)
    if (exists(val)) {
      components = discoverUserComponents(val)
      const dest = join(workspace, 'src', 'components')
      copyDir(val, dest)
      rm(val)
      if (components.length) {
        console.info(theme.success(`✓ Discovered ${components.length} custom component(s)`))
      }
    }
  }

  // Discover CSS files - recursively walk assets directory, filter for .css files,
  // and convert absolute paths to relative paths for workspace linking
  // TODO: Consider using find-up's findDown instead of custom walk
  const assetsPath = realpath(workspace, 'public', assets)
  const css = assetsPath
    ? walk(assetsPath, f => f.endsWith('.css')).map(f => ({
        path: f.replace(join(workspace, 'public'), '').replace(/^\//, ''),
      }))
    : []
  if (css.length) {
    console.info(theme.success(`✓ Discovered ${css.length} CSS file(s)`))
  }

  // Create workspace package.json
  write(join(workspace, 'package.json'), draftPackageJSON(base.dir, {name: 'docfu-workspace'}))
  console.info(theme.success('✓ Created workspace package.json'))

  // Create lockfile without installing node_modules
  system(`cd ${workspace} && ${pkgmgr.getCommand('lockfile')}`)
  console.info(theme.success(`✓ Created ${pkgmgr.lockfile}`))

  // Initialize manifest
  manifest.init(config)

  // Process markdown files
  await processMarkdown(workspace, {
    source: base.source,
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

  console.log()
  console.info(theme.success('✓ Workspace staged successfully'))
  return {workspace, config, source: base.source, sandbox: base.sandbox}
}

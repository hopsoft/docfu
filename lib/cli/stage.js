import yaml from 'js-yaml'
import {confirm} from '@inquirer/prompts'
import manifest from '../manifest.js'
import {DocFuConfig} from '../docfu-config.js'
import {collectConfigs, isExcluded, isUnlisted} from '../sandbox-config-parser.js'
import {discoverUserComponents} from '../markdown/components.js'
import {draftPackageJSON} from '../packages.js'
import {pm} from '../package-manager.js'
import {processMarkdown} from '../markdown.js'
import {publish as pub} from '../event-bus.js'
import {theme} from '../theme.js'

function withLogger(callback) {
  console.info(theme.tertiary('='.repeat(80)))
  callback({...theme, ...console})
  console.info(theme.tertiary('='.repeat(80)))
}

/**
 * Stage workspace for documentation build
 * @param {string} source - Source directory path
 * @param {Object} [options={}] - Staging options
 * @param {string} [options.sandbox] - Sandbox directory path (default: .docfu)
 * @returns {Promise<Object>} Workspace paths and config
 */
async function stage(source, options = {}) {
  global.docfu = new DocFuConfig(source, options.sandbox)
  const {source: src, sandbox} = docfu

  // Clean sandbox if it exists
  if (!options.unsafe) {
    console.warn(theme.warning('→ The following directory will be deleted:'))
    console.warn('  ', theme.symbolic(sandbox.directory))

    const confirmed = await confirm({
      message: 'Delete and continue?',
      default: false,
    })

    if (!confirmed) {
      console.info(theme.tertiary('✗ Cancelled'))
      process.exit(0)
    }
  }

  // Create sandbox and workspace
  sandbox.directory.mkdir({overwrite: true})
  sandbox.workspace.directory.mkdir({overwrite: true})
  withLogger(({info, success}) => {
    info(success('✓ Setup sandbox and workspace directories:'))
    info(success.dim(`  • Sandbox: ${sandbox.directory}`))
    info(success.dim(`  • Workspace: ${sandbox.workspace.directory}`))
  })

  // Collect all DocFu configs, merge, and create master config in sandbox
  const {master: config, hierarchical: configs} = collectConfigs()
  sandbox.config.path.write(yaml.dump(config))
  withLogger(({info, success}) => {
    info(success('✓ Created master config file:'))
    if (configs?.length) info(success.dim(`  ✓ Merged ${configs.length} docfu.yml files`))
    info(success.dim(`  • Config file: ${sandbox.config.path}`))
  })

  // Setup workspace foundation for astro/starlight
  docfu.directory.join('public').copy(sandbox.workspace.directory.join('public'))
  docfu.directory.join('src').copy(sandbox.workspace.directory.join('src'))
  docfu.directory.join('astro.config.mjs').copy(sandbox.workspace.directory.join('astro.config.mjs'))
  docfu.directory.join('markdoc.config.mjs').copy(sandbox.workspace.directory.join('markdoc.config.mjs'))
  docfu.directory.join('tsconfig.json').copy(sandbox.workspace.directory.join('tsconfig.json'))
  withLogger(({info, success}) => {
    info(success('✓ Setup workspace foundation:'))
    info(success.dim(`  • ${sandbox.workspace.directory.join('public')}`))
    info(success.dim(`  • ${sandbox.workspace.directory.join('src')}`))
    info(success.dim(`  • ${sandbox.workspace.directory.join('astro.config.mjs')}`))
    info(success.dim(`  • ${sandbox.workspace.directory.join('markdoc.config.mjs')}`))
    info(success.dim(`  • ${sandbox.workspace.directory.join('tsconfig.json')}`))
  })

  // Copy content from source to workspace
  const sourceDocs = src.directory.read() || []
  const workspaceDocs = sandbox.workspace.directory.join('src', 'content', 'docs')
  workspaceDocs.mkdir()
  sourceDocs.forEach(sourceDoc => {
    const sourcePath = src.directory.join(sourceDoc)
    if (sourcePath.equals(sandbox.directory)) return
    const workspacePath = workspaceDocs.join(sourceDoc)
    sourcePath.copy(workspacePath)
  })
  withLogger(({info, success}) => {
    info(success('✓ Copied content from source to workspace:'))
    info(success.dim(`  • Source files: ${sourceDocs.length}`))
    info(success.dim(`  • Workspace docs: ${workspaceDocs}`))
  })

  // Cleanup unwanted files
  const cleanup = [
    ...workspaceDocs.glob('**/docfu.yml'),
    ...workspaceDocs.glob('**/*').filter(f => {
      // Map workspace path back to source path for pattern matching
      const rel = f.replace(`${workspaceDocs}/`, '')
      const sourcePath = src.directory.join(rel)
      return isExcluded(String(sourcePath), config.exclude)
    }),
  ]
  cleanup.forEach(f => {
    const path = workspaceDocs.join(f.replace(`${workspaceDocs}/`, ''))
    path.remove()
  })
  pub('done', {cleanup: {files: cleanup.length}})

  // Remove empty parent directories
  const cleanedDirs = new Set()
  cleanup.forEach(f => {
    let dirPath = workspaceDocs.join(f.replace(`${workspaceDocs}/`, '')).directory
    while (dirPath != workspaceDocs && !cleanedDirs.has(String(dirPath))) {
      cleanedDirs.add(String(dirPath))
      const entries = dirPath.read()
      if (entries?.length) break
      dirPath.remove()
      dirPath = dirPath.directory
    }
  })

  // Organize assets
  const assets = config.assets || 'assets'
  const assetsPath = workspaceDocs.join(assets)
  if (assetsPath.exists) {
    assetsPath.move(sandbox.workspace.directory.join('public', assets))
    pub('done', {assets: {path: assets, dest: 'public'}})
  }

  // Discover and organize components
  const dir = config.components ?? 'components'
  let components = []

  if (dir !== false && dir !== null) {
    const componentsPath = workspaceDocs.join(dir)
    if (componentsPath.exists) {
      components = discoverUserComponents(String(componentsPath))
      const dest = sandbox.workspace.directory.join('src', 'components')
      componentsPath.copy(dest)
      componentsPath.remove()
      if (components.length) {
        console.info(theme.success(`✓ Discovered ${components.length} custom component(s)`))
      }
    }
  }

  // Discover CSS files - recursively walk assets directory, filter for .css files,
  // and convert absolute paths to relative paths for workspace linking
  const publicAssets = sandbox.workspace.directory.join('public', assets)
  const css = publicAssets.exists
    ? publicAssets.glob('**/*.css').map(f => ({
        path: f.replace(`${sandbox.workspace.directory.join('public')}/`, ''),
      }))
    : []
  if (css.length) {
    console.log()
    console.info(theme.success(`✓ Discovered ${css.length} CSS file(s)`))
  }

  // Create workspace package.json
  sandbox.workspace.directory
    .join('package.json')
    .write(draftPackageJSON(String(docfu.directory), {name: 'docfu-workspace'}))
  console.log()
  console.info(theme.success('✓ Created workspace package.json'))

  // Create lockfile
  if (pm.lockfileTemplatePath) {
    pm.lockfileTemplatePath.copy(sandbox.workspace.directory.join(pm.lockfileTemplatePath.basename))
  } else {
    await pm.lock({cwd: sandbox.workspace.directory})
  }

  console.log()
  console.info(theme.success(`✓ Created ${pm.lockfileName}`))

  // Initialize manifest
  manifest.init(config)

  // Process markdown files
  await processMarkdown(components, configs)

  // Emit component and CSS discovery events
  pub('components:discovered', {directory: dir, items: components})
  pub('css:discovered', {items: css})

  // Write manifest
  sandbox.manifest.path.write(JSON.stringify(manifest.data, null, 2))

  console.log()
  console.info(theme.success('✓ Workspace staged successfully'))
  return {
    workspace: sandbox.workspace.directory,
    workspaceDocs,
    config,
    source: src.directory,
    sandbox: sandbox.directory,
  }
}

export default stage

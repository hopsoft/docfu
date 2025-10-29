import stage from './stage.js'
import {pm} from '../package-manager.js'
import {publish as pub} from '../event-bus.js'
import {theme} from '../theme.js'

/**
 * Build documentation site from markdown source
 * @param {string} source - Source directory path
 * @param {Object} [options={}] - Build options
 * @param {string} [options.sandbox] - Sandbox directory path (default: .docfu)
 * @param {boolean} [options.unsafe] - Skip confirmations
 * @returns {Promise<Object>} Build paths and config
 */
async function build(source, options = {}) {
  // Stage workspace (sets global docfu)
  const {workspace, config} = await stage(source, options)
  pub('done', {staged: workspace})

  // Run Astro build (dependencies already available via DocFu's node_modules)
  console.log()
  console.info(theme.normal('→ Building documentation site...'))
  await pm.run('astro', 'build', {cwd: workspace})
  pub('done', {astro: 'build complete'})

  // Verify dist was created (Astro outputs to sandbox/dist via outDir: '../dist')
  const dist = docfu.sandbox.dist.directory
  if (!dist.exists) {
    pub('fail', {dist: 'Astro build did not create dist directory'})
    console.error(theme.danger('✗ Build failed: no dist directory created'))
    process.exit(1)
  }

  // Success output
  console.log()
  console.info(theme.success('✓ Documentation site built successfully'))
  console.info(`${theme.tertiary('Output:')} ${theme.secondary(dist)}`)
  if (config.site?.url) {
    console.info(`${theme.tertiary('Site URL:')} ${theme.secondary(config.site.url)}`)
  }

  pub('done', {complete: true})

  return {
    workspace,
    config,
    dist,
    source: docfu.source.directory,
    sandbox: docfu.sandbox.directory,
  }
}

export default build

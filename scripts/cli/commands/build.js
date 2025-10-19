// import {fileURLToPath} from 'url'
// import {findUp} from 'find-up'
// import {dirname, join, resolve, basename} from 'path'
// import {existsSync, readFileSync} from 'fs'
// import {mkdir, copyFile, cp, writeFile} from 'fs/promises'
// import {getResolvedPaths, setEnvVars, runCommand, resolveBinary} from '../utils.js'
// import {processDocuments} from '../../lib/prepare.js'

import {realpathSync as realpath} from 'fs'
import {dirname} from 'path'
import {getPackageManager} from '../detector.js'
import theme from '../theme.js'

const DOCFU_ROOT = process.env.DOCFU_ROOT || '.docfu'

async function setupWorkspaceProject(workspace, packageRoot) {
  // // Copy base src/ structure from DocFu
  // const src = join(packageRoot, 'src')
  // const workspaceSrc = join(workspace, 'src')
  // if (existsSync(src)) {
  //   await cp(src, workspaceSrc, {recursive: true, force: true})
  // }
  //
  // // Copy config files (package.json created separately in buildCommand)
  // const configs = ['astro.config.mjs', 'markdoc.config.mjs', 'tsconfig.json']
  // for (const name of configs) {
  //   const source = join(packageRoot, name)
  //   const dest = join(workspace, name)
  //   if (existsSync(source)) {
  //     await copyFile(source, dest)
  //   }
  // }

  // Copy public/ fallback
  const publicSource = join(packageRoot, 'public')
  const publicDest = join(workspace, 'public')
  if (existsSync(publicSource) && !existsSync(publicDest)) {
    await cp(publicSource, publicDest, {recursive: true, force: true})
  }
}

export default async function buildCommand(source, options, packageJson) {
  try {
  } catch (err) {}

  process.env.DOCFU_SOURCE = source

  const paths = getResolvedPaths(source, options)

  console.info(theme.primary(`DocFu v${packageJson.version}`))
  console.info(`${theme.muted('Source:')} ${theme.secondary(paths.source)}`)
  console.info(`${theme.muted('Workspace:')} ${theme.secondary(paths.workspace)}`)
  console.info(`${theme.muted('Build output:')} ${theme.secondary(paths.dist)}`)
  console.info()

  // Dry run mode - show config and exit
  if (options.dryRun) {
    console.info(theme.success('✓ Configuration validated (dry-run mode)'))
    console.info()
    console.info(theme.muted('Would process:'))
    console.info(`  ${theme.secondary(paths.source)} ${theme.muted('→')} ${theme.secondary(paths.workspace)}`)
    console.info()
    console.info(theme.muted('Would create/clean:'))
    console.info(`  ${theme.secondary(paths.workspace)}`)
    console.info(`  ${theme.secondary(paths.dist)}`)
    return
  }

  try {
    // setEnvVars(paths)

    // Process source markdown (this also cleans/recreates entire .docfu directory)
    // const success = await processDocuments(paths.source, paths.root, options)
    // if (!success) throw new Error('✗ Document processing failed')

    // Get package root for copying project files
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const packageRoot = resolve(__dirname, '../../..')

    // Setup workspace as full Astro/Starlight project
    await setupWorkspaceProject(paths.workspace, packageRoot)

    console.info()
    console.info(theme.success('✓ Documentation processed'))

    // Create package.json in workspace
    const docfuPkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf-8'))
    const workspacePkg = {
      name: 'docfu-workspace',
      version: docfuPkg.version,
      private: true,
      type: 'module',
      dependencies: docfuPkg.dependencies,
    }
    console.info(JSON.srtringify(workspacePkg, null, 2))
    await writeFile(join(paths.workspace, 'package.json'), JSON.stringify(workspacePkg, null, 2))

    // Create package lock file in workspace
    const pm = detectPackageManager()
    const installCommands = {
      bun: () => ['bun', ['install']],
      yarn: () => [
        'yarn',
        getYarnMajorVersion() === 1 ? ['install', '--silent', '--prefer-offline'] : ['install', '--silent'],
      ],
      pnpm: () => ['pnpm', ['install', '--silent', '--prefer-offline']],
      npm: () => ['npm', ['install', '--force', '--no-audit', '--package-lock-only', '--prefer-offline', '--silent']],
    }
    const [cmd, args] = installCommands[pm]()
    await runCommand(cmd, args, {cwd: paths.workspace})
    const {binaryPath: astroBin} = await resolveBinary('astro', import.meta.url)

    console.info()
    console.info(theme.info('Building site...'))
    await runCommand(astroBin, ['build'], {cwd: paths.workspace})

    console.info()
    console.info(theme.success('✓ Build complete'))
    console.info(`${theme.muted('Output:')} ${theme.secondary(paths.dist)}`)
  } catch (error) {
    console.error(theme.danger(`✗ Build failed: ${error.message}`))
    process.exit(1)
  }
}

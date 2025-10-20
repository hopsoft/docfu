import yaml from 'js-yaml'
import {copyDir, copyFile, dirname, join, mkdir, move, read, realpath, rm} from '../file-system.js'
import env from '../env.js'

export default function build(src, options) {
  env.source = src
  env.sandbox = options.sandbox || '.docfu'

  // TODO: track all activity so we can create manifest.json

  // 1. Create sandbox directory
  mkdir(env.sandbox, {overwrite: true}) // todo: user confirms overwrite

  // 2. Create workspace (starlight project)
  mkdir(env.workspace)
  copyDir(realpath(env.sandbox, 'public'), join(env.workspace, 'public'))
  copyDir(realpath(env.sandbox, 'src'), join(env.workspace, 'src'))
  copyFile(realpath(env.sandbox, 'astro.config.mjs'), env.workspace)
  copyFile(realpath(env.sandbox, 'markdoc.config.mjs'), env.workspace)
  copyFile(realpath(env.sandbox, 'tsconfig.json'), env.workspace)

  // 3. Copy user docfu configuration file (source/docfu.yml → sandbox/workspace/config.yml)
  const configPath = realpath(env.source, 'docfu.yml') || realpath(env.base, 'docfu.example.yml')
  const config = yaml.load(read(configPath))
  copyFile(configPath, join(env.workspace, 'config.yml'))

  // 3. Copy user content (source → sandbox/workspace/src/content/docs)
  copyDir(env.source, realpath(env.workspace, 'src', 'content', 'docs'))

  // 4. Organize assets ([assets] → workspace/public/[assets])
  copyDir(
    realpath(env.workspace, 'src', 'content', 'docs', config.assets || 'assets'),
    join(env.workspace, 'public', config.assets || 'assets')
  )

  // 5. Organize components ([components] → workspace/src/components)
  copyDir(
    realpath(env.workspace, 'src', 'content', 'docs', config.components || 'components'),
    join(env.workspace, 'src', 'components')
  )

  // 6. Process .md, .mdoc, .mdx files
  // 7. Create sandbox/workspace/package.json and generate a lock file without installing with package manager
}

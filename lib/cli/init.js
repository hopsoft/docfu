import {input, confirm} from '@inquirer/prompts'
import {exists, expandTilde, join, read, realpath, write} from '../file-system.js'
import env from '../env.js'
import theme from '../theme.js'

export default async function init(src, options = {}) {
  const source = expandTilde(
    src ||
      (await input({
        message: 'Where are your markdown docs?',
        default: './docs',
      }))
  )

  const sourcePath = realpath(source)
  if (!sourcePath) {
    console.error(theme.danger('✗ NOT FOUND'), theme.muted(source))
    process.exit(1)
  }

  const configPath = join(sourcePath, 'docfu.yml')

  if (exists(configPath) && !options.force) {
    console.log()
    console.log(theme.warning(`⚠ ${configPath} already exists`))
    const overwrite = await confirm({
      message: 'Overwrite existing configuration?',
      default: false,
    })

    if (!overwrite) {
      console.log(theme.muted('Cancelled.'))
      return
    }
  }

  const templatePath = join(env.base, 'docfu.example.yml')
  const template = read(templatePath)

  write(configPath, template)

  console.log()
  console.log(theme.success(`✓ Created ${configPath}`))
  console.log()
  console.log(theme.muted('Next steps:'))
  console.log(theme.muted(`  1. Edit ${configPath} to customize your site`))
  console.log(theme.muted(`  2. Run: docfu build ${source}`))
}

import {input, confirm} from '@inquirer/prompts'
import {exists, join, read, realpath, write} from '../file-system.js'
import env from '../env.js'
import theme from '../theme.js'

export default async function init(src, options = {}) {
  src ||= await input({
    message: 'Where are your markdown docs?',
    default: './docs',
  })

  const source = realpath(src)
  const configPath = join(source, 'docfu.yml')

  if (exists(configPath) && !options.force) {
    console.log()
    console.log(theme.warning(`⚠ ${configPath} already exists`))
    const overwrite = await confirm({
      message: 'Overwrite existing configuration?',
      default: false,
    })

    if (!overwrite) {
      console.log(theme.tertiary('Cancelled.'))
      return
    }
  }

  const templatePath = join(env.base, 'docfu.example.yml')
  const template = read(templatePath)
  write(configPath, template)

  console.log()
  console.log(theme.success(`✓ Created ${configPath}`))
  console.log()
  console.log(theme.tertiary('Next steps:'))
  console.log(theme.tertiary(`  1. Edit ${configPath} to customize your site`))
  console.log(theme.tertiary(`  2. Run: docfu build ${source}`))
}

import {input, confirm} from '@inquirer/prompts'
import {exists, write} from '../file-system.js'
import base from '../base.js'
import theme from '../theme.js'

export default async function init(source, options = {}) {
  const {force} = options

  source ||= await input({
    message: 'Where are your markdown docs?',
    default: './docs',
  })

  base.source = source
  base.sandbox = options.sandbox

  if (exists(base.configPath) && !force) {
    console.log()
    console.warn(theme.warning(`⚠ ${base.configPath} already exists`))
    const overwrite = await confirm({
      message: 'Overwrite existing configuration?',
      default: false,
    })

    if (!overwrite) {
      console.info(theme.tertiary('Cancelled.'))
      process.exit(0)
    }
  }

  write(base.configPath, base.configTemplate)

  console.log()
  console.info(theme.success(`✓ Created ${base.configPath}`))
  console.log()
  console.info(theme.normal('Next steps:'))
  console.info(theme.normal(`  1. Edit ${base.configPath} to customize your site`))
  console.info(theme.normal(`  2. Run: docfu build ${base.source}`))
}

import {input, confirm} from '@inquirer/prompts'
import {DocFuConfig} from '../docfu-config.js'
import {Pathname} from '../pathname.js'
import {theme} from '../theme.js'

export default async function init(source, options = {}) {
  const {force} = options

  source ||= await input({
    message: 'Where are your markdown docs?',
    default: './docs',
  })

  global.docfu = new DocFuConfig(source, options.sandbox)

  const configPath = new Pathname(source, 'docfu.yml')
  const configTemplate = `site:
  name: My Documentation
  url: https://example.com
  theme: nova

# Exclude patterns (optional)
# exclude:
#   - drafts
#   - '*.tmp.md'

# Unlisted patterns (optional - still accessible but hidden from search)
# unlisted:
#   - internal
#   - 'wip-*.md'
`

  if (configPath.exists && !force) {
    console.log()
    console.warn(theme.warning(`⚠ ${configPath} already exists`))
    const overwrite = await confirm({
      message: 'Overwrite existing configuration?',
      default: false,
    })

    if (!overwrite) {
      console.info(theme.tertiary('Cancelled.'))
      process.exit(0)
    }
  }

  configPath.write(configTemplate)

  console.log()
  console.info(theme.success(`✓ Created ${configPath}`))
  console.log()
  console.info(theme.normal('Next steps:'))
  console.info(theme.normal(`  1. Edit ${configPath} to customize your site`))
  console.info(theme.normal(`  2. Run: docfu build ${source}`))
}

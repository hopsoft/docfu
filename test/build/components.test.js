/**
 * Components tests
 * Verifies all components (Starlight and custom) work with both MDX and Markdoc syntax
 * Tests that DocFu auto-imports components and renders them correctly
 */

import {assert, describe, it} from 'vitest'
import {realpath} from '../../lib/file-system.js'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseHTML} from '../parsers/html-parser.js'
import {parseJSON} from '../parsers/json-parser.js'
import {parseMDX} from '../parsers/mdx-parser.js'
import {parseText} from '../parsers/text-parser.js'
import base from '../../lib/base.js'

describe('Components', () => {
  it('should render all Starlight components with MDX and Markdoc syntax', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'mdx-components.mdx': `---
title: MDX Components
---

# Starlight Components - MDX Syntax

<Aside type="note" title="Note Title">
This is a note aside.
</Aside>

<Badge text="New" variant="tip" />
<Badge text="Deprecated" variant="danger" />

<Card title="Single Card" icon="star">
This is a single card with content.
</Card>

<CardGrid>
  <Card title="Card 1" icon="rocket">
    First card in grid.
  </Card>
  <Card title="Card 2" icon="document">
    Second card in grid.
  </Card>
</CardGrid>

<Code code="console.log('Hello')" lang="js" title="example.js" />

<FileTree>

- src/
  - index.js
  - utils.js
- package.json

</FileTree>

<Icon name="star" />

<LinkCard title="API Reference" href="/api" description="Complete API documentation" />

<Steps>

1. Install dependencies
2. Configure your site
3. Deploy to production

</Steps>

<Tabs>
  <TabItem label="npm">
    \`\`\`bash
    npm install docfu
    \`\`\`
  </TabItem>
  <TabItem label="yarn">
    \`\`\`bash
    yarn add docfu
    \`\`\`
  </TabItem>
</Tabs>

<LinkButton href="/get-started">Get Started</LinkButton>`,
        'markdoc-components.md': `---
title: Markdoc Components
---

# Starlight Components - Markdoc Syntax

{% aside type="note" title="Note Title" %}
This is a note aside.
{% /aside %}

{% badge text="New" variant="tip" /%}
{% badge text="Deprecated" variant="danger" /%}

{% card title="Single Card" icon="star" %}
This is a single card with content.
{% /card %}

{% cardgrid %}
{% card title="Card 1" icon="rocket" %}
First card in grid.
{% /card %}
{% card title="Card 2" icon="document" %}
Second card in grid.
{% /card %}
{% /cardgrid %}

{% code code="console.log('Hello')" lang="js" title="example.js" /%}

{% filetree %}

- src/
  - index.js
  - utils.js
- package.json

{% /filetree %}

{% icon name="star" /%}

{% linkcard title="API Reference" href="/api" description="Complete API documentation" /%}

{% steps %}

1. Install dependencies
2. Configure your site
3. Deploy to production

{% /steps %}

{% tabs %}
{% tabitem label="npm" %}
\`\`\`bash
npm install docfu
\`\`\`
{% /tabitem %}
{% tabitem label="yarn" %}
\`\`\`bash
yarn add docfu
\`\`\`
{% /tabitem %}
{% /tabs %}

{% linkbutton href="/get-started" %}Get Started{% /linkbutton %}`,
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Test MDX components rendering
      parseHTML(base.dist, 'mdx-components', 'index.html', ({assertText, assertSelector}) => {
        assertSelector('[class*="aside"]')
        assertText('main', 'Note Title')
        assertText('main', 'New')
        assertText('main', 'Deprecated')
        assertText('main', 'Single Card')
        assertText('main', 'Card 1')
        assertText('main', 'Card 2')
        assertText('main', 'console.log')
        assertText('main', 'index.js')
        assertText('main', 'API Reference')
        assertText('main', 'Install dependencies')
        assertText('main', 'npm install docfu')
        assertText('main', 'Get Started')
      })

      // Test Markdoc components rendering
      parseHTML(base.dist, 'markdoc-components', 'index.html', ({assertText, assertSelector}) => {
        assertSelector('[class*="aside"]')
        assertText('main', 'Note Title')
        assertText('main', 'New')
        assertText('main', 'Deprecated')
        assertText('main', 'Single Card')
        assertText('main', 'Card 1')
        assertText('main', 'Card 2')
        assertText('main', 'console.log')
        assertText('main', 'index.js')
        assertText('main', 'API Reference')
        assertText('main', 'Install dependencies')
        assertText('main', 'npm install docfu')
        assertText('main', 'Get Started')
      })
    }))

  it('should auto-inject imports for .md files with MDX syntax', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'components/MyWidget.astro': `---
const { title = 'Widget' } = Astro.props
---
<div class="my-widget">
  <h3>{title}</h3>
  <slot />
</div>`,
        'index.md': `---
title: MDX Auto-Import
---

# MDX Components

<MyWidget title="Auto Imported">
Content here
</MyWidget>`,
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify auto-import was added
      parseMDX(base.workspace, 'src/content/docs/index.mdx', ({assertImport}) => assertImport('MyWidget'))

      // Verify rendering
      parseHTML(base.dist, 'index.html', ({assertText, assertSelector}) => {
        assertSelector('.my-widget')
        assertText('main', 'Auto Imported')
        assertText('main', 'Content here')
      })
    }))

  it('should auto-inject imports for .mdx files without explicit imports', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'components/InfoBox.astro': `---
const { type = 'info' } = Astro.props
---
<div class="info-box" data-type={type}>
  <slot />
</div>`,
        'index.mdx': `---
title: MDX Without Imports
---

# Components

<InfoBox type="success">
Success message
</InfoBox>`,
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify auto-import was added
      parseMDX(base.workspace, 'src/content/docs/index.mdx', ({assertImport}) => assertImport('InfoBox'))

      // Verify rendering
      parseHTML(base.dist, 'index.html', ({assertText, assertSelector}) => {
        assertSelector('.info-box[data-type="success"]')
        assertText('main', 'Success message')
      })
    }))

  it('should render .md files with Markdoc syntax', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': `---
title: Markdoc Syntax
---

# Markdoc Test

{% aside type="note" %}
This is a note.
{% /aside %}`,
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify converted to .mdoc
      assert(realpath(base.workspace, 'src/content/docs/index.mdoc'), 'Should convert to .mdoc')

      // Verify rendering
      parseHTML(base.dist, 'index.html', ({assertText, assertSelector}) => {
        assertSelector('[class*="aside"]')
        assertText('main', 'This is a note')
      })
    }))

  it('should render custom components with props', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'components/MyWidget.astro': `---
const { title = 'Widget', variant = 'default' } = Astro.props
---
<div class="my-widget" data-variant={variant}>
  <h3>{title}</h3>
  <slot />
</div>`,
        'components/InfoBox.astro': `---
const { type = 'info', icon = '→' } = Astro.props
---
<div class="info-box" data-type={type}>
  <span class="info-icon">{icon}</span>
  <slot />
</div>`,
        'index.md': `---
title: Custom Components
---

# Custom Components

<MyWidget title="My Widget" variant="primary">
Widget content here
</MyWidget>

<InfoBox type="warning" icon="⚠">
Warning message
</InfoBox>`,
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      parseJSON(base.sandbox, 'manifest.json', ({assertContainsWhere}) => {
        assertContainsWhere('components.items', {name: 'MyWidget'})
        assertContainsWhere('components.items', {name: 'InfoBox'})
      })

      assert(realpath(base.workspace, 'src/components/MyWidget.astro'), 'Should copy MyWidget to workspace')
      assert(realpath(base.workspace, 'src/components/InfoBox.astro'), 'Should copy InfoBox to workspace')

      parseHTML(base.dist, 'index.html', ({assertText, assertSelector}) => {
        assertSelector('.my-widget[data-variant="primary"]')
        assertText('main', 'My Widget')
        assertText('main', 'Widget content here')
        assertSelector('.info-box[data-type="warning"]')
        assertText('.info-icon', '⚠')
        assertText('main', 'Warning message')
      })
    }))

  it('should discover and configure Starlight component extensions', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'components/CustomCode.astro': `---
import {Code} from '@astrojs/starlight/components'

const {code, lang, title, ...rest} = Astro.props
const customTitle = title ? \`📝 \${title}\` : undefined
---

<Code code={code} lang={lang} title={customTitle} {...rest} />`,
        'index.md': `---
title: Test Page
---

# Test Page

<CustomCode code="console.log('test')" lang="js" title="Example" />`,
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify component discovered in manifest
      parseJSON(base.sandbox, 'manifest.json', ({assertContainsWhere}) => {
        assertContainsWhere('components.items', {name: 'CustomCode'})
        assertContainsWhere('components.items', {filename: 'CustomCode.astro'})
      })

      // Verify component copied to workspace
      assert(realpath(base.workspace, 'src/components/CustomCode.astro'), 'Should copy CustomCode to workspace')

      // Verify component content preserved
      parseText(base.workspace, 'src/components/CustomCode.astro', ({assertContains}) => {
        assertContains('Code', 'Should import Code from Starlight')
        assertContains('@astrojs/starlight/components', 'Should import from Starlight components')
        assertContains('customTitle', 'Should preserve component logic')
      })

      // Verify auto-inject of import
      parseMDX(base.workspace, 'src/content/docs/index.mdx', ({assertImport}) => assertImport('CustomCode'))

      // Verify rendering
      parseHTML(base.dist, 'index.html', ({assertText}) => {
        assertText('main', '📝 Example')
        assertText('main', "console.log('test')")
      })
    }))

  it('should handle explicit imports, subdirectories, and mixed components', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'components/widgets/Alert.astro': `---
const { type = 'info' } = Astro.props
---
<div class="alert" data-type={type}>
  <slot />
</div>`,
        'components/Button.astro': `---
const { variant = 'default' } = Astro.props
---
<button class="btn" data-variant={variant}>
  <slot />
</button>`,
        // .mdx with explicit import (should not duplicate)
        'explicit.mdx': `---
title: Explicit Imports
---
import Button from '../../components/Button.astro'

# Explicit Import Test

<Button variant="primary">Click Me</Button>`,
        // .md with mixed custom + Starlight components
        'mixed.md': `---
title: Mixed Components
---

# Mixed Components

<Alert type="warning">
Custom alert component
</Alert>

<Aside type="note">
Starlight aside component
</Aside>

<Button variant="secondary">
Custom button
</Button>`,
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify subdirectory components discovered in manifest
      parseJSON(base.sandbox, 'manifest.json', ({assertContainsWhere}) => {
        assertContainsWhere('components.items', {name: 'Alert', path: 'widgets/Alert.astro'})
        assertContainsWhere('components.items', {name: 'Button', path: 'Button.astro'})
      })

      // Verify subdirectory component copied to workspace
      assert(
        realpath(base.workspace, 'src/components/widgets/Alert.astro'),
        'Should copy subdirectory component to workspace'
      )

      // Verify explicit imports not duplicated
      parseMDX(base.workspace, 'src/content/docs/explicit.mdx', ({assertImportCount, assertImport}) => {
        assertImportCount(1, 'Should not duplicate explicit imports')
        assertImport('Button', '../../components/Button.astro', 'Should preserve explicit import')
      })

      // Verify mixed components auto-inject correctly
      parseMDX(base.workspace, 'src/content/docs/mixed.mdx', ({assertImport}) => {
        assertImport('Alert', 'widgets/Alert.astro', 'Should auto-inject custom Alert import with subdirectory path')
        assertImport('Button', 'Button.astro', 'Should auto-inject custom Button import')
        assertImport('Aside', '@astrojs/starlight/components', 'Should auto-inject Starlight Aside import')
      })

      // Verify rendering
      parseHTML(base.dist, 'explicit', 'index.html', ({assertText, assertSelector}) => {
        assertSelector('.btn[data-variant="primary"]')
        assertText('main', 'Click Me')
      })

      parseHTML(base.dist, 'mixed', 'index.html', ({assertText, assertSelector}) => {
        assertSelector('.alert[data-type="warning"]')
        assertText('main', 'Custom alert component')
        assertSelector('[class*="aside"]')
        assertText('main', 'Starlight aside component')
        assertSelector('.btn[data-variant="secondary"]')
        assertText('main', 'Custom button')
      })
    }))
})

/**
 * Mermaid diagram tests
 * Tests mermaid rendering in .md, .mdx, and .mdoc files with various syntax options
 */

import {assert, describe, it} from 'vitest'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseHTML} from '../parsers/html-parser.js'
import {parseMarkdown} from '../parsers/markdown-parser.js'
import base from '../../lib/base.js'

describe('Mermaid Diagrams', () => {
  it('should render mermaid diagrams across all formats and syntaxes', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        // .md with code fence
        'md-fence.md': `# Markdown Code Fence

\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`
`,
        // .mdx with code fence
        'mdx-fence.mdx': `---
title: MDX Code Fence
---

# MDX Code Fence

\`\`\`mermaid
graph LR
    Start --> End
\`\`\`
`,
        // .mdx with Fence component
        'mdx-component.mdx': `---
title: MDX Component
---

# MDX Fence Component

<Fence code={\`sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob-->>Alice: Hi Alice\`} lang="mermaid" />
`,
        // .mdoc with code fence
        'mdoc-fence.mdoc': `# Markdoc Code Fence

\`\`\`mermaid
stateDiagram-v2
    [*] --> Still
    Still --> Moving
    Moving --> Crash
    Crash --> [*]
\`\`\`
`,
        // Multiple diagrams in one file
        'multi.md': `# Multiple Diagrams

## Flow Chart

\`\`\`mermaid
pie title Pets
    "Dogs" : 386
    "Cats" : 85
\`\`\`

## Mixed with code

\`\`\`javascript
const x = 42
\`\`\`

\`\`\`mermaid
graph TD
    X --> Y
\`\`\`
`,
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Test .md with code fence
      parseHTML(base.dist, 'md-fence', 'index.html', ({assertSelector, assertText}) => {
        assertSelector('pre.mermaid')
        assertText('pre.mermaid', 'graph TD')
        assertText('pre.mermaid', 'A[Start]')
        assertText('pre.mermaid', 'B[Process]')
        assertText('pre.mermaid', 'C[End]')
      })

      // Test .mdx with code fence
      parseHTML(base.dist, 'mdx-fence', 'index.html', ({assertSelector, assertText}) => {
        assertSelector('pre.mermaid')
        assertText('pre.mermaid', 'graph LR')
        assertText('pre.mermaid', 'Start')
        assertText('pre.mermaid', 'End')
      })

      // Test .mdx with Fence component
      parseHTML(base.dist, 'mdx-component', 'index.html', ({assertSelector, assertText}) => {
        assertSelector('pre.mermaid')
        assertText('pre.mermaid', 'sequenceDiagram')
        assertText('pre.mermaid', 'Alice->>Bob')
        assertText('pre.mermaid', 'Bob-->>Alice')
      })

      // Test .mdoc with code fence (verify workspace file + output)
      parseMarkdown(base.workspace, 'src', 'content', 'docs', 'mdoc-fence.mdoc', ({data}) => {
        assert(data, 'Should preserve .mdoc file in workspace')
      })

      parseHTML(base.dist, 'mdoc-fence', 'index.html', ({assertSelector, assertText}) => {
        assertSelector('pre.mermaid')
        assertText('pre.mermaid', 'stateDiagram-v2')
        assertText('pre.mermaid', '[*] --> Still')
        assertText('pre.mermaid', 'Moving --> Crash')
      })

      // Test multiple diagrams + mixed code blocks
      parseHTML(base.dist, 'multi', 'index.html', ({assertSelector, assertText}) => {
        assertSelector('pre.mermaid:nth-of-type(1)')
        assertSelector('pre.mermaid:nth-of-type(2)')
        assertText('main', 'pie title Pets')
        assertText('main', 'graph TD')
        assertText('main', 'const x = 42')
        // Verify mermaid pre doesn't have nested code element
        assertSelector('pre.mermaid:not(:has(code))')
      })
    }))
})

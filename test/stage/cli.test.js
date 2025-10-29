/**
 * CLI tests for stage command
 * Tests staging phase without building
 */

import {assert, describe, it} from 'vitest'
import {join, realpath} from '../../lib/file-system.js'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseYAML} from '../parsers/yaml-parser.js'
import {parseJSON} from '../parsers/json-parser.js'
import {parseMarkdown} from '../parsers/markdown-parser.js'
import base from '../../lib/base.js'

describe('Stage Command', () => {
  it('should stage files to workspace', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test Stage\n  url: https://test.example.com',
        'index.md': '# Home\n\nWelcome to the test documentation.',
        'guide.md': '# Guide\n\nGuide content here.',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${sourcedir}`)
      base.source = sourcedir

      assert(realpath(base.workspace), `Should create: ${base.workspace}`)
      assert.isUndefined(realpath(base.dist), `Should not create: ${base.dist}`)

      parseYAML(base.sandbox, 'config.yml', ({data}) => {
        assert(data.site, 'Should contain: site')
        assert.strictEqual(data.site.name, 'Test Stage')
        assert.strictEqual(data.site.url, 'https://test.example.com')
      })

      parseJSON(base.sandbox, 'manifest.json', ({assertLength, assertContainsWhere, data}) => {
        assertLength('docs', 2)
        const indexDoc = data.docs.find(d => d.slug === 'index' || d.slug === '')
        assert.isDefined(indexDoc, 'Should include: index')
        assertContainsWhere('docs', {slug: 'guide'})
      })

      const docsdir = realpath(base.workspace, 'src', 'content', 'docs')
      parseMarkdown(docsdir, 'index.md', ({assertKey}) => assertKey('title'))
      parseMarkdown(docsdir, 'guide.md', ({assertKey}) => assertKey('title'))
    }))

  it('should support custom sandbox directory', async ({task}) =>
    quarantine(task, async sourcedir => {
      const sandbox = join(sourcedir, 'custom-sandbox')

      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test Stage\n  url: https://test.example.com',
        'index.md': '# Home',
      })

      await spawn(`node ./bin/docfu stage --unsafe --sandbox ${sandbox} ${sourcedir}`)
      base.sandbox = sandbox

      assert.equal(sandbox, base.sandbox, `Should use sandbox: ${sandbox}`)
      assert(realpath(base.workspace), `Should create: ${base.workspace}`)
      assert.isUndefined(realpath(sourcedir, '.docfu'), `Should not create: ${join(sourcedir, '.docfu')}`)

      const docsdir = realpath(base.workspace, 'src', 'content', 'docs')
      parseMarkdown(docsdir, 'index.md', ({assertKey}) => assertKey('title'))
    }))

  it('should stage files with complex directory structure', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test Stage\n  url: https://test.example.com',
        'index.md': '# Home',
        'guides/getting-started.md': '# Getting Started',
        'guides/advanced/tips.md': '# Advanced Tips',
        'api/reference.md': '# API Reference',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${sourcedir}`)
      base.source = sourcedir

      parseJSON(base.sandbox, 'manifest.json', ({assertLength, assertContainsWhere, data}) => {
        assertLength('docs', 4)
        const indexDoc = data.docs.find(d => d.slug === 'index' || d.slug === '')
        assert.isDefined(indexDoc, 'Should include: index')
        assertContainsWhere('docs', {slug: 'guides/getting-started'})
        assertContainsWhere('docs', {slug: 'guides/advanced/tips'})
        assertContainsWhere('docs', {slug: 'api/reference'})
      })

      const docsdir = realpath(base.workspace, 'src', 'content', 'docs')
      assert(docsdir, `Should create: ${docsdir}`)
      assert(realpath(docsdir, 'index.md'), `Should stage: ${join(docsdir, 'index.md')}`)
      assert(
        realpath(docsdir, 'guides/getting-started.md'),
        `Should stage: ${join(docsdir, 'guides/getting-started.md')}`
      )
      assert(realpath(docsdir, 'guides/advanced/tips.md'), `Should stage: ${join(docsdir, 'guides/advanced/tips.md')}`)
      assert(realpath(docsdir, 'api/reference.md'), `Should stage: ${join(docsdir, 'api/reference.md')}`)
    }))
})

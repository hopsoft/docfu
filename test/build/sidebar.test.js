/**
 * Sidebar generation tests
 * Tests auto-generated and explicit sidebar configurations
 */

import {assert, describe, it} from 'vitest'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseHTML} from '../parsers/html-parser.js'
import {parseJSON} from '../parsers/json-parser.js'
import {parseYAML} from '../parsers/yaml-parser.js'
import {buildSidebar} from '../../src/utils/sidebar.js'
import base from '../../lib/base.js'

describe('Sidebar Generation', () => {
  it('should auto-generate sidebar grouped by top-level directories', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home',
        'about.md': '# About',
        'guides/quickstart.md': '# Quickstart',
        'guides/advanced.md': '# Advanced Guide',
        'api/auth.md': '# Authentication',
        'api/users.md': '# Users API',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify manifest has all docs
      parseJSON(base.sandbox, 'manifest.json', ({assertKey, assertLength, assertContainsWhere}) => {
        assertKey('docs')
        assertLength('docs', 6)
        assertContainsWhere('docs', {slug: 'index'})
        assertContainsWhere('docs', {slug: 'guides/quickstart'})
      })

      // Verify config and test buildSidebar
      parseYAML(base.sandbox, 'config.yml', ({data: config}) => {
        const manifest = parseJSON(base.sandbox, 'manifest.json', ({data}) => data)
        const sidebar = buildSidebar(manifest, config)

        // Verify sidebar structure
        const ungroupedItems = sidebar.filter(item => item.slug)
        const groups = sidebar.filter(item => item.label && item.items)

        assert.strictEqual(sidebar.length, 4)
        assert.strictEqual(ungroupedItems.length, 2)
        assert.strictEqual(groups.length, 2)

        assert.ok(ungroupedItems.find(item => item.slug === 'index'))
        assert.ok(ungroupedItems.find(item => item.slug === 'about'))

        const guidesGroup = groups.find(g => g.label === 'Guides')
        assert.ok(guidesGroup)
        assert.strictEqual(guidesGroup.items.length, 2)

        const apiGroup = groups.find(g => g.label === 'Api')
        assert.ok(apiGroup)
        assert.strictEqual(apiGroup.items.length, 2)
      })

      // Verify HTML output
      parseHTML(base.dist, 'index.html', ({assertText}) => {
        assertText('body', 'Home')
        assertText('body', 'About')
        assertText('body', 'Guides')
        assertText('body', 'Quickstart')
        assertText('body', 'Advanced Guide')
        assertText('body', 'Api')
        assertText('body', 'Authentication')
        assertText('body', 'Users API')
      })
    }))

  it('should support explicit sidebar with ordering and custom labels', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
    label: Home
  - file: zebra.md
  - file: alpha.md
  - file: quickstart.md
    label: Quick Start`,
        'index.md': '# Welcome',
        'zebra.md': '# Zebra',
        'alpha.md': '# Alpha',
        'quickstart.md': '# Getting Started Fast',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify config has explicit sidebar
      parseYAML(base.sandbox, 'config.yml', ({assertKey}) => {
        assertKey('sidebar')
        assertKey('sidebar[0].file', 'index.md')
        assertKey('sidebar[0].label', 'Home')
      })

      // Verify manifest
      parseJSON(base.sandbox, 'manifest.json', ({assertLength}) => {
        assertLength('docs', 4)
      })

      // Test buildSidebar preserves order and custom labels
      parseYAML(base.sandbox, 'config.yml', ({data: config}) => {
        const manifest = parseJSON(base.sandbox, 'manifest.json', ({data}) => data)
        const sidebar = buildSidebar(manifest, config)

        assert.strictEqual(sidebar.length, 4)
        assert.strictEqual(sidebar[0].slug, 'index')
        assert.strictEqual(sidebar[0].label, 'Home')
        assert.strictEqual(sidebar[1].slug, 'zebra')
        assert.strictEqual(sidebar[2].slug, 'alpha')
        assert.strictEqual(sidebar[3].slug, 'quickstart')
        assert.strictEqual(sidebar[3].label, 'Quick Start')
      })

      // Verify HTML includes all items in config order
      parseHTML(base.dist, 'index.html', ({assertText, assertSelector}) => {
        assertText('body', 'Home')
        assertText('body', 'Zebra')
        assertText('body', 'Alpha')
        assertText('body', 'Quick Start')
        assertSelector('nav')
      })
    }))

  it('should support sidebar groups with mixed structures and collapsed state', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
    label: Home
  - file: about.md
  - group: Getting Started
    items:
      - quickstart.md
      - installation.md
  - file: contact.md
  - group: API Reference
    items:
      - file: api/auth.md
        label: Authentication
      - file: api/users.md
  - group: Advanced Topics
    collapsed: true
    items:
      - advanced/optimization.md
      - advanced/security.md`,
        'index.md': '# Welcome',
        'about.md': '# About Us',
        'contact.md': '# Contact',
        'quickstart.md': '# Quickstart',
        'installation.md': '# Installation',
        'api/auth.md': '# Auth API',
        'api/users.md': '# Users',
        'advanced/optimization.md': '# Performance Optimization',
        'advanced/security.md': '# Security Best Practices',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify HTML includes all groups, ungrouped items, and collapsed group
      parseHTML(base.dist, 'index.html', ({assertText}) => {
        assertText('body', 'Home')
        assertText('body', 'About Us')
        assertText('body', 'Contact')
        assertText('body', 'Getting Started')
        assertText('body', 'Quickstart')
        assertText('body', 'Installation')
        assertText('body', 'API Reference')
        assertText('body', 'Authentication')
        assertText('body', 'Users')
        assertText('body', 'Advanced Topics')
        assertText('body', 'Performance Optimization')
        assertText('body', 'Security Best Practices')
      })
    }))

  it('should support directory auto-generation in sidebar config', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
  - group: API Endpoints
    directory: api/`,
        'index.md': '# Home',
        'api/auth.md': '# Authentication',
        'api/users.md': '# User Management',
        'api/posts.md': '# Posts API',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify HTML includes all files from api/
      parseHTML(base.dist, 'index.html', ({assertText}) => {
        assertText('body', 'API Endpoints')
        assertText('body', 'Authentication')
        assertText('body', 'User Management')
        assertText('body', 'Posts API')
      })
    }))

  it('should support sidebar badges with string and object syntax', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
  - file: new-feature.md
    badge: New
  - group: Features
    items:
      - file: stable.md
        badge:
          text: Stable
          variant: success
      - file: beta.md
        badge:
          text: Beta
          variant: caution`,
        'index.md': '# Home',
        'new-feature.md': '# New Feature',
        'stable.md': '# Stable Feature',
        'beta.md': '# Beta Feature',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Test buildSidebar with badges
      parseYAML(base.sandbox, 'config.yml', ({data: config}) => {
        const manifest = parseJSON(base.sandbox, 'manifest.json', ({data}) => data)
        const sidebar = buildSidebar(manifest, config)

        assert.strictEqual(sidebar.length, 3)

        // Check simple string badge
        const newFeature = sidebar.find(item => item.slug === 'new-feature')
        assert.ok(newFeature.badge)
        assert.strictEqual(newFeature.badge.text, 'New')
        assert.strictEqual(newFeature.badge.variant, 'note')

        // Check object badges in group
        const featuresGroup = sidebar.find(item => item.label === 'Features')
        assert.ok(featuresGroup)
        assert.strictEqual(featuresGroup.items.length, 2)

        const stableItem = featuresGroup.items.find(item => item.slug === 'stable')
        assert.ok(stableItem.badge)
        assert.strictEqual(stableItem.badge.text, 'Stable')
        assert.strictEqual(stableItem.badge.variant, 'success')

        const betaItem = featuresGroup.items.find(item => item.slug === 'beta')
        assert.ok(betaItem.badge)
        assert.strictEqual(betaItem.badge.text, 'Beta')
        assert.strictEqual(betaItem.badge.variant, 'caution')
      })

      // Verify HTML includes all badges
      parseHTML(base.dist, 'index.html', ({assertText}) => {
        assertText('body', 'New')
        assertText('body', 'New Feature')
        assertText('body', 'Stable')
        assertText('body', 'Beta')
        assertText('body', 'Stable Feature')
        assertText('body', 'Beta Feature')
      })
    }))

  it('should allow same file to appear in multiple groups', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
  - group: Getting Started
    items:
      - file: quickstart.md
        badge: Popular
  - group: Guides
    items:
      - file: quickstart.md
        label: Quick Reference`,
        'index.md': '# Home',
        'quickstart.md': '# Quickstart Guide',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify HTML includes both instances with different labels/badges
      parseHTML(base.dist, 'index.html', ({assertText}) => {
        assertText('body', 'Getting Started')
        assertText('body', 'Guides')
        assertText('body', 'Popular')
        assertText('body', 'Quick Reference')
      })
    }))

  it('should handle sidebar with no config (fallback to auto-generation)', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home',
        'guides/start.md': '# Getting Started',
        'api/endpoints.md': '# API Endpoints',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify HTML includes auto-generated sidebar
      parseHTML(base.dist, 'index.html', ({assertText}) => {
        assertText('body', 'Home')
        assertText('body', 'Getting Started')
        assertText('body', 'API Endpoints')
      })
    }))
})

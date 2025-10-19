import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import remarkStringify from 'remark-stringify'
import {visit} from 'unist-util-visit'
import {STRINGIFY_OPTIONS, stringify} from './unified.js'
import {patterns} from '../regex.js'

const ALERT_TYPES = {
  NOTE: 'note',
  TIP: 'tip',
  IMPORTANT: 'caution',
  WARNING: 'caution',
  CAUTION: 'danger',
}

/**
 * Convert single badge to Markdoc tag
 * @param {string} text - Badge text
 * @param {string} attrs - Attributes string
 * @returns {string} Markdoc badge tag
 */
function convertBadge(text, attrs = '') {
  const props = [`text="${text}"`]
  const pairs = attrs.match(/(\w+)=(\w+)/g) || []

  for (const pair of pairs) {
    const [key, val] = pair.split('=')
    const propKey = key === 'type' ? 'variant' : key
    if (['variant', 'size'].includes(propKey)) props.push(`${propKey}="${val}"`)
  }

  return `{% badge ${props.join(' ')} /%}`
}

/**
 * Convert badges in text
 * @param {string} text - Text with badge syntax
 * @returns {string} Text with Markdoc badges
 */
function convertBadges(text) {
  return text.replace(patterns.syntax.badgePattern, (_, text, attrs) => convertBadge(text, attrs))
}

/**
 * Convert GitHub alert blockquote to Markdoc aside
 * @param {string} content - Content with alerts
 * @returns {Promise<string>} Converted content
 */
async function convertAlerts(content) {
  if (!patterns.syntax.githubAlert.test(content)) return content

  const tree = await unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(() => tree => {
      visit(tree, 'blockquote', (node, index, parent) => {
        const firstPara = node.children?.[0]
        const firstChild = firstPara?.children?.[0]
        if (!firstChild || firstChild.type !== 'text') return

        const match = firstChild.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/)
        if (!match) return

        const alertType = ALERT_TYPES[match[1]]
        firstChild.value = firstChild.value.slice(match[0].length)
        if (firstChild.value === '' && firstPara.children.length === 1) node.children.shift()

        const childContent = node.children
          .map(child => stringify({type: 'root', children: [child]}))
          .join('')
          .trim()

        parent.children[index] = {
          type: 'html',
          value: `{% aside type="${alertType}" %}\n${childContent}\n{% /aside %}`,
        }
      })
    })
    .use(remarkStringify, STRINGIFY_OPTIONS)
    .process(content)

  return String(tree)
}

/**
 * Convert heading badges
 * @param {string} content - Content with heading badges
 * @returns {string} Converted content
 */
function convertHeadingBadges(content) {
  return content
    .split('\n')
    .map(line => (/^#{1,6}\s/.test(line) ? convertBadges(line) : line))
    .join('\n')
}

/**
 * Convert frontmatter title badges
 * @param {string} content - Content with frontmatter
 * @returns {string} Converted content
 */
function convertFrontmatterBadges(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/m)
  if (!fmMatch) return content

  const titleMatch = fmMatch[1].match(/^title:\s*(.+)$/m)
  if (!titleMatch || !titleMatch[1].includes(':badge[')) return content

  const converted = convertBadges(titleMatch[1])
  return content.replace(titleMatch[0], `title: ${converted}`)
}

/**
 * Convert to Markdoc
 * @param {string} path - File path
 * @param {string} content - Content
 * @returns {Promise<string>} Markdoc content
 */
async function toMarkdoc(path, content) {
  let result = content
  result = await convertAlerts(result)
  result = convertHeadingBadges(result)
  result = convertFrontmatterBadges(result)
  return result
}

export {toMarkdoc}

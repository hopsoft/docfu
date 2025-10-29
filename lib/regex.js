/**
 * Centralized regex patterns used throughout DocFu
 * Single source of truth for all pattern matching
 */

export const patterns = {
  markdown: {
    convertible: /\.(md|markdown|mdown|mkdn|mkd|mdwn|mdtxt|mdtext|text|txt)$/i,
    all: /\.(md|markdown|mdown|mkdn|mkd|mdwn|mdtxt|mdtext|text|txt|mdx|mdoc|markdoc)$/i,
    mdx: /\.mdx$/i,
    markdoc: /\.(mdoc|markdoc)$/i,
  },

  syntax: {
    jsxComponent: /<[A-Z][A-Za-z0-9]*[\s/>]/,
    markdocTag: /{%\s+\w+[^%]*%\}/,
    headingBadge: /^#{1,6}\s+.*:badge\[[^\]]*\]/m,
    githubAlert: />\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i,
    badgePattern: /:badge\\?\[([^\]]*?)\\?\](?:\{([^}]+)\})?/g,
  },

  links: {
    readme: /^(.*?\/)?readme(\.md|\.mdx|\.mdoc)?$/i,
    absolute: /^(https?:|\/|#)/,
  },

  frontmatter: /^---\n([\s\S]*?)\n---/,
  heading: /^#\s+(.+)$/m,
}

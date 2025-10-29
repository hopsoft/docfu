import chalk from 'chalk'

const theme = Object.freeze({
  danger: chalk.red.bold,
  emphasis: chalk.bold,
  normal: chalk,
  primary: chalk.cyan.bold,
  secondary: chalk.cyan.dim,
  success: chalk.green.bold,
  symbolic: chalk.magenta,
  tertiary: chalk.dim,
  underline: chalk.underline,
  vivid: chalk.blue,
  warning: chalk.yellow,
})

export {theme}

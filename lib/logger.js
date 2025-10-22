import bus from './bus.js'
import {basename} from './file-system.js'
import pkgmgr from './package-manager.js'
import theme from './theme.js'

function extract(data) {
  let {FILE: file, ...payload} = data
  if (file) file = `docfu/${file}`
  const keys = Object.keys(payload)
  const id = keys[0]
  return {file, id, payload: payload[id]}
}

function wrap(value, head = '[', tail = ']') {
  return `${theme.tertiary(head)}${value}${theme.tertiary(tail)}`
}

function format(label, data, style) {
  let {file, id, payload} = extract(data)
  let pkg = wrap(style(pkgmgr.name.toUpperCase()))
  label = wrap(style(label.toUpperCase()))
  style ||= theme.tertiary
  payload = theme.tertiary(JSON.stringify(payload))
  if (file) file = wrap(style(file))
  if (id) id = wrap(style(`${id}`))
  if (file && id) return [pkg, label, file, id, payload]
  if (file) return [pkg, label, file, payload]
  if (id) return [pkg, label, id, payload]
  return [pkg, label, payload]
}

const topics = {
  // console
  debug: data => console.debug(...format('debug', data, theme.tertiary)),
  error: data => console.error(...format('error', data, theme.danger)),
  info: data => console.info(...format('info', data, theme.normal)),
  log: data => console.log(...format('log', data, theme.normal)),
  trace: data => console.trace(...format('trace', data, theme.tertiary)),
  warn: data => console.warn(...format('warn', data, theme.warning)),

  // docfu
  call: data => console.info(...format('➜|call', data, theme.vivid)),
  done: data => console.info(...format('✓|done', data, theme.success)),
  exec: data => console.info(...format(`❯|exec`, data, theme.symbolic)),
  fail: data => console.error(...format('‼︎|fail', data, theme.danger)),
  memo: data => console.info(...format('•|memo', data, theme.tertiary)),
  miss: data => console.warn(...format('∅|miss', data, theme.warning)),
  omit: data => console.info(...format('✗|omit', data, theme.tertiary)),
}

Object.keys(topics).forEach(t => bus.sub(t, topics[t]))

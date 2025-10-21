import bus from './bus.js'
import pkgmgr from './package-manager.js'
import theme from './theme.js'

function extract(data) {
  const {env: _env, file, ...payload} = data
  delete payload.env

  const keys = Object.keys(payload)
  if (keys.length === 1) {
    if (typeof payload[keys[0]].opts === 'object') {
      const {env: _, ...opts} = payload[keys[0]].opts
      payload[keys[0]].opts = opts
    }
    return {file, id: keys[0], payload: payload[keys[0]]}
  }

  return {file, id: null, payload}
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
  if (file) file = wrap(`${style(file)}`)
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
  call: data => console.info(...format('call|➜', data, theme.vivid)),
  done: data => console.info(...format('done|✓', data, theme.success)),
  exec: data => console.info(...format(`exec|⏯`, data, theme.symbolic)),
  fail: data => console.error(...format('fail|‼︎', data, theme.danger)),
  miss: data => console.warn(...format('miss|∅', data, theme.warning)),
  omit: data => console.info(...format('omit|✗', data, theme.tertiary)),
}

Object.keys(topics).forEach(t => bus.sub(t, topics[t]))

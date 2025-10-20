import bus from './bus.js'
import theme from './theme.js'

function extract(data) {
  const {file, ...payload} = data
  const keys = Object.keys(payload)
  if (keys.length === 1) return {file, id: keys[0], payload: payload[keys[0]]}
  else return {file, id: null, payload}
}

function wrap(value, head = '[', tail = ']') {
  return `${theme.tertiary(head)}${value}${theme.tertiary(tail)}`
}

function format(prefix, label, data, style) {
  let {file, id, payload} = extract(data)
  prefix = wrap(style(prefix.toUpperCase()))
  label = wrap(style(label.toUpperCase()))
  style ||= theme.tertiary
  payload = theme.tertiary(JSON.stringify(payload))
  if (file) file = wrap(`${style(file)}`)
  if (id) id = wrap(style(`${id}`))
  if (file && id) return [prefix, label, file, id, payload]
  if (file) return [prefix, label, file, payload]
  if (id) return [prefix, label, id, payload]
  return [prefix, label, payload]
}

const topics = {
  call: data => console.info(...format('info', 'call', data, theme.primary)),
  error: data => console.error(...format('error', 'error', data, theme.danger)),
  excluded: data => console.info(...format('info', 'excluded', data, theme.tertiary)),
  info: data => console.info(...format('info', 'info', data, theme.tertiary)),
  missing: data => console.warn(...format('warn', 'missing', data, theme.warning)),
  success: data => console.info(...format('info', 'success', data, theme.success)),
  warn: data => console.warn(...format('warn', 'warn', data, theme.warning)),
}

Object.keys(topics).forEach(t => bus.sub(t, topics[t]))

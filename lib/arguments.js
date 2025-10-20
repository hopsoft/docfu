function extractOptions() {
  const args = Array.from(arguments)
  const size = args.length
  const opts = args[size - 1]
  if (typeof opts === 'object') return {args: args[(0, size - 1)], opts}
  return {args, opts: {}}
}

export {extractOptions}

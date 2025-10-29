import {defineConfig} from 'vitest/config'
import {availableParallelism} from 'node:os'

export default defineConfig({
  test: {
    environment: 'node',
    bail: 1,
    globals: false,
    minWorkers: 1,
    maxWorkers: Math.ceil(availableParallelism() / 2),
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    sequence: {
      concurrent: true,
      shuffle: {files: true, tests: true},
    },
    testTimeout: 300000,
    disableConsoleIntercept: true,
    reporters: ['dot'],
    env: {
      FORCE_COLOR: '1',
    },
  },
})

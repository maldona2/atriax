export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  // Cap parallelism and recycle workers that grow past the limit, so the suite
  // cannot demand more memory than the machine has (workers x heap > RAM).
  maxWorkers: '50%',
  workerIdleMemoryLimit: '1GB',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', 'setup\\.ts$', '\\.d\\.ts$'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
};

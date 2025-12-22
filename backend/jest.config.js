module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/app.ts',
    '!src/**/index.ts',
    '!src/**/*.helper.ts'
  ],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
      // Убрали isolatedModules отсюда
    }]
  },
  testTimeout: 30000,
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/__tests__/testApp.helper.ts',
    '<rootDir>/src/__tests__/setup.ts'
  ],
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true
};
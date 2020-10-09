module.exports = {
  testEnvironment: 'node',
  testTimeout: 2147483647,
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '\\.ts$': 'ts-jest' },
  coverageReporters: ['lcov', 'text-summary'],
  // collectCoverage: !!process.env.CI,
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['/templates/'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  testPathIgnorePatterns: ['/__fixtures__/', '/__utils__/'],
};

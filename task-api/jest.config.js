export default {
  testEnvironment: 'node',
  transform: {},
  verbose: true,
  testTimeout: 30000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js'],
  testMatch: ['**/tests/**/*.test.js'],
};

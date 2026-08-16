module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js'],
  coverageReporters: ['text', 'lcov', 'clover', 'json-summary'],
  testMatch: ['**/tests/**/*.test.js'],
};

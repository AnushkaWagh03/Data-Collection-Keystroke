module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverageFrom: [
    'src/routes/**/*.js',
    'src/server.js',
  ],
  testMatch: ['**/tests/**/*.test.js'],
};

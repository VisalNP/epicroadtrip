module.exports = {
  testPathIgnorePatterns: [
    'src/mocks/',
    'src/appConstants.js', 
    '/node_modules/',
    '/build/',
  ],

  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}', 
    '!src/reportWebVitals.js',
    '!src/index.js', 
    '!src/setupTests.js',
    '!**/node_modules/**',
    '!**/__tests__/**',   
    '!**/__mocks__/**', 
    '!src/__mocks__/**', 
    '!**/vendor/**',
    '!coverage/**',
    '!jest.config.js',
    '!src/services/api.js',
    '!src/constants/appConstants.js', 
  ],

  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    'src/__mocks__/', 
    '/coverage/',
    'jest.config.js',
    'reportWebVitals.js',
    'src/index.js',
    'setupTests.js',
    'src/services/api.js',
    'src/constants/appConstants.js',

    'src/App.js',
  ],

  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};
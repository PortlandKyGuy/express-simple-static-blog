module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'index.js',
        'lib/**/*.js',
        '!**/node_modules/**',
        '!**/test/**'
    ],
    testMatch: [
        '**/test/**/*.test.js'
    ],
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50
        }
    }
};
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
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};
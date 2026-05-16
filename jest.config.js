/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/src/test/**/*.test.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/src/test/ui/', '/.vscode-test/'],
    modulePathIgnorePatterns: ['<rootDir>/.vscode-test/'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }]
    }
};

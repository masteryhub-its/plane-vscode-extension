/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/*.d.ts', '!src/extension.ts', '!src/vscode/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: { global: { lines: 90, statements: 90, functions: 92, branches: 72 } },
  moduleFileExtensions: ['ts', 'js', 'json'],
  // sanitize-html 2.17.7+ (the security-fixed line) depends on ESM-only htmlparser2. esbuild bundles it fine;
  // jest runs CommonJS, so these packages are compiled on the fly for tests only.
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs', target: 'ES2022', esModuleInterop: true }, diagnostics: false }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(sanitize-html|htmlparser2|domhandler|domutils|dom-serializer|domelementtype|entities)/)'],
  verbose: true,
};

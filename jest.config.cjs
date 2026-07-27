module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  // Runs before any module under test is imported: strips credentials so config.ts cannot
  // capture them, and blocks non-loopback network access. See tests/setup/hermetic.ts.
  setupFiles: ['<rootDir>/tests/setup/hermetic.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true, diagnostics: { ignoreCodes: [1343, 151002] } }]
  },
  extensionsToTreatAsEsm: ['.ts']
};

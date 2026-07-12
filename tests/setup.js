// Global test setup for unit tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('PYTHON_API_UNAVAILABLE') || args[0]?.includes?.('HARMONY_NOT_INSTALLED')) {
      return;
    }
    originalError.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock timers for consistent testing
jest.useFakeTimers();
import '@testing-library/jest-dom/vitest';

const MockIntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};
global.IntersectionObserver = MockIntersectionObserver as any;


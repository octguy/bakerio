import '@testing-library/jest-dom/vitest';

const MockIntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};
global.IntersectionObserver = MockIntersectionObserver as any;

const MockResizeObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};
global.ResizeObserver = MockResizeObserver as any;


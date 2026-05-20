import { describe, it, expect } from 'vitest';
import { registerSchema } from './schema';

describe('registerSchema', () => {
  it('passes with valid data', () => {
    const result = registerSchema.safeParse({ name: 'John', email: 'john@example.com', password: '123456' });
    expect(result.success).toBe(true);
  });

  it('fails with empty name', () => {
    const result = registerSchema.safeParse({ name: '', email: 'john@example.com', password: '123456' });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].path).toContain('name');
  });

  it('fails with invalid email', () => {
    const result = registerSchema.safeParse({ name: 'John', email: 'bad', password: '123456' });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].path).toContain('email');
  });

  it('fails with short password', () => {
    const result = registerSchema.safeParse({ name: 'John', email: 'john@example.com', password: '12' });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].message).toContain('at least 6');
  });

  it('fails with missing fields', () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error!.issues.length).toBeGreaterThanOrEqual(3);
  });
});

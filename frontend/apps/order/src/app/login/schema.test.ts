import { describe, it, expect } from 'vitest';
import { loginSchema } from './schema';

describe('loginSchema', () => {
  it('passes with valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '123456' });
    expect(result.success).toBe(true);
  });

  it('fails with invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '123456' });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].path).toContain('email');
  });

  it('fails with empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: '123456' });
    expect(result.success).toBe(false);
  });

  it('fails with short password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '12345' });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].message).toContain('at least 6');
  });

  it('fails with empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});

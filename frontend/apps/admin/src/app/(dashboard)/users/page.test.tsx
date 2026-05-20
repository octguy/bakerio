import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@repo/api-client', () => ({
  createUser: vi.fn(),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  Users: () => <span>👥</span>,
}));

import UsersPage from './page';

afterEach(cleanup);

describe('UsersPage', () => {
  it('renders the users heading', () => {
    render(<UsersPage />);
    expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument();
  });

  it('shows placeholder message about user listing', () => {
    render(<UsersPage />);
    expect(screen.getByText(/user listing will be available/i)).toBeInTheDocument();
  });

  it('has an add user button', () => {
    render(<UsersPage />);
    expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
  });
});

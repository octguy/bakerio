import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createUser } from '@repo/api-client';

const mockToast = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(({ mutationFn, onSuccess, onError }: any) => ({
    mutate: async (variables: any) => {
      try {
        const result = await mutationFn(variables);
        if (onSuccess) onSuccess(result);
      } catch (err: any) {
        if (onError) onError(err);
      }
    },
    isPending: false,
  })),
}));

vi.mock('@repo/api-client', () => ({
  createUser: vi.fn(),
}));

vi.mock('@repo/api-client/mock/staff', () => ({
  getStaff: vi.fn().mockResolvedValue([
    { email: "thinh@bakerio.vn", name: "Thinh Nguyễn", initial: "T", role: "Manager", branch: "Lê Lợi", start: "2024", status: "clocked-in", shift: "06:00 — 14:00", accent: "cinnamon" }
  ]),
  getStaffCounts: vi.fn().mockResolvedValue({ total: 46, onShift: 28 }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => open ? (
    <div data-testid="dialog">
      <button data-testid="close-dialog" onClick={() => onOpenChange?.(false)}>X</button>
      {children}
    </div>
  ) : null,
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
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  Users: () => <span>👥</span>,
}));

import UsersPage from './page';

describe('UsersPage CRUD flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('renders correctly and shows staff list', async () => {
    render(<UsersPage />);
    expect(screen.getByRole('heading', { name: /staff/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Thinh Nguyễn')).toBeInTheDocument();
    });
  });

  it('opens and closes the dialog when Cancel is clicked', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    expect(screen.getByText('Full Name')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText('Full Name')).not.toBeInTheDocument();
  });

  it('submits createUser successfully', async () => {
    vi.mocked(createUser).mockResolvedValue({ id: 'u-123' } as any);
    const { container } = render(<UsersPage />);

    fireEvent.click(screen.getByRole('button', { name: /add user/i }));

    const fullNameInput = container.querySelector('input[name="full_name"]')!;
    const emailInput = container.querySelector('input[name="email"]')!;
    const passwordInput = container.querySelector('input[name="password"]')!;
    const roleSelect = container.querySelector('select[name="role"]')!;

    fireEvent.change(fullNameInput, { target: { value: 'Jane Doe' } });
    fireEvent.change(emailInput, { target: { value: 'jane@bakerio.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(roleSelect, { target: { value: 'manager' } });

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(createUser).toHaveBeenCalledWith({
        full_name: 'Jane Doe',
        email: 'jane@bakerio.com',
        password: 'password123',
        role: 'manager',
      });
      expect(mockToast).toHaveBeenCalledWith('User created');
      expect(screen.queryByText('Full Name')).not.toBeInTheDocument();
    });
  });

  it('handles createUser failure gracefully', async () => {
    vi.mocked(createUser).mockRejectedValue(new Error('User email exists'));
    const { container } = render(<UsersPage />);

    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    fireEvent.change(container.querySelector('input[name="full_name"]')!, { target: { value: 'Err User' } });
    fireEvent.change(container.querySelector('input[name="email"]')!, { target: { value: 'err@bakerio.com' } });
    fireEvent.change(container.querySelector('input[name="password"]')!, { target: { value: 'password123' } });
    fireEvent.change(container.querySelector('select[name="role"]')!, { target: { value: 'staff' } });

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('User email exists', 'error');
    });
  });

  it('closes dialog via onOpenChange callback', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    expect(screen.getByText('Full Name')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('close-dialog'));
    expect(screen.queryByText('Full Name')).not.toBeInTheDocument();
  });
});

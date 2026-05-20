import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [{ id: '1', name: 'Downtown', address: '123 Main St', region: 'north', status: 'active' }], isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-table', () => ({}));

vi.mock('@repo/api-client', () => ({
  getBranches: vi.fn(),
  createBranch: vi.fn(),
  updateBranch: vi.fn(),
  deleteBranch: vi.fn(),
}));

vi.mock('@/components/data-table', () => ({
  DataTable: ({ data }: { data: any[] }) => (
    <table><tbody>{data.map((d: any) => <tr key={d.id}><td>{d.name}</td></tr>)}</tbody></table>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
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
  Pencil: () => <span>✎</span>,
  Trash2: () => <span>🗑</span>,
}));

import BranchesPage from './page';

afterEach(cleanup);

describe('BranchesPage', () => {
  it('renders the branches heading', () => {
    render(<BranchesPage />);
    expect(screen.getByRole('heading', { name: /branches/i })).toBeInTheDocument();
  });

  it('shows branch data from query', () => {
    render(<BranchesPage />);
    expect(screen.getByText('Downtown')).toBeInTheDocument();
  });

  it('has an add branch button', () => {
    render(<BranchesPage />);
    expect(screen.getByRole('button', { name: /add branch/i })).toBeInTheDocument();
  });

  it('opens dialog when clicking Add Branch', () => {
    render(<BranchesPage />);
    fireEvent.click(screen.getByRole('button', { name: /add branch/i }));
    expect(screen.getByText('New Branch')).toBeInTheDocument();
  });

  it('shows loading state when data is loading', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: true } as any);
    render(<BranchesPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows no data when query fails', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false, error: new Error('Failed') } as any);
    render(<BranchesPage />);
    expect(screen.queryByText('Downtown')).not.toBeInTheDocument();
  });
});

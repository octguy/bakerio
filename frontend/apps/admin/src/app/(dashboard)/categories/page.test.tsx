import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [{ id: '1', name: 'Bread', slug: 'bread', sort_order: 1, is_active: true }], isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-table', () => ({}));

vi.mock('@repo/api-client', () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
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

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  Pencil: () => <span>✎</span>,
  Trash2: () => <span>🗑</span>,
}));

import CategoriesPage from './page';

afterEach(cleanup);

describe('CategoriesPage', () => {
  it('renders the categories heading', () => {
    render(<CategoriesPage />);
    expect(screen.getByRole('heading', { name: /categories/i })).toBeInTheDocument();
  });

  it('shows category data from query', () => {
    render(<CategoriesPage />);
    expect(screen.getByText('Bread')).toBeInTheDocument();
  });

  it('has an add category button', () => {
    render(<CategoriesPage />);
    expect(screen.getByRole('button', { name: /add category/i })).toBeInTheDocument();
  });

  it('opens dialog when clicking Add Category', () => {
    render(<CategoriesPage />);
    fireEvent.click(screen.getByRole('button', { name: /add category/i }));
    expect(screen.getByText('New Category')).toBeInTheDocument();
  });

  it('shows loading state when data is loading', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: true } as any);
    render(<CategoriesPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows no data when query fails', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false, error: new Error('Failed') } as any);
    render(<CategoriesPage />);
    expect(screen.queryByText('Bread')).not.toBeInTheDocument();
  });
});

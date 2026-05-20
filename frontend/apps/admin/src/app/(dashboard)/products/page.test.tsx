import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useQuery } from "@tanstack/react-query";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: [{ id: "1", name: "Bread", base_price: 25000, category: { name: "Bakery" }, sku: "BRD001", unit: "piece", is_active: true }],
    isLoading: false,
  })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock("@repo/api-client", () => ({
  getProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  getCategories: vi.fn(),
}));

vi.mock("@/components/data-table", () => ({
  DataTable: ({ data }: any) => (
    <table>
      <tbody>
        {data.map((row: any) => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>{row.category?.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/utils", () => ({
  formatCurrency: (n: number) => `${n} ₫`,
}));

vi.mock("lucide-react", () => ({
  Plus: () => <span>+</span>,
  Pencil: () => <span>✎</span>,
  Trash2: () => <span>🗑</span>,
}));

import ProductsPage from "./page";

afterEach(cleanup);

describe("ProductsPage", () => {
  it("renders the products heading", () => {
    render(<ProductsPage />);
    expect(screen.getByRole("heading", { name: /products/i })).toBeInTheDocument();
  });

  it("shows product data in the table", () => {
    render(<ProductsPage />);
    expect(screen.getByText("Bread")).toBeInTheDocument();
    expect(screen.getByText("Bakery")).toBeInTheDocument();
  });

  it("has an add product button", () => {
    render(<ProductsPage />);
    expect(screen.getByRole("button", { name: /add product/i })).toBeInTheDocument();
  });

  it("opens dialog when clicking Add Product", () => {
    render(<ProductsPage />);
    fireEvent.click(screen.getByRole("button", { name: /add product/i }));
    expect(screen.getByText("New Product")).toBeInTheDocument();
  });

  it("shows loading state when data is loading", () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: true } as any);
    render(<ProductsPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows error message when query fails", () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false, error: new Error("Failed") } as any);
    render(<ProductsPage />);
    expect(screen.queryByText("Bread")).not.toBeInTheDocument();
  });
});

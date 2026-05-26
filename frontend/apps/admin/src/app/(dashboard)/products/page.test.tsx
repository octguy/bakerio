import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { createProduct, updateProduct, deleteProduct } from "@repo/api-client";

const mockToast = vi.fn();
const mockInvalidate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: [
      {
        id: "p-1",
        name: "Bread",
        base_price: 25000,
        category: { id: "cat-1", name: "Bakery" },
        sku: "BRD001",
        unit: "piece",
        is_active: true,
      },
    ],
    isLoading: false,
  })),
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
  useQueryClient: vi.fn(() => ({
    invalidateQueries: mockInvalidate,
  })),
}));

vi.mock("@repo/api-client", () => ({
  getProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  getCategories: vi.fn(() => [{ id: "cat-1", name: "Bakery" }]),
}));

vi.mock("@/components/data-table", () => ({
  DataTable: ({ columns, data }: any) => (
    <table>
      <tbody>
        {data.map((row: any, rIdx: number) => (
          <tr key={row.id || rIdx}>
            {columns.map((col: any, cIdx: number) => (
              <td key={cIdx}>
                {col.cell
                  ? col.cell({ row: { original: row } })
                  : row[col.accessorKey]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }: any) =>
    open ? (
      <div data-testid="dialog">
        <button
          data-testid="close-dialog"
          onClick={() => onOpenChange?.(false)}
        >
          X
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, ...props }: any) => (
    <select {...props}>{children}</select>
  ),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: mockToast }),
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

describe("ProductsPage CRUD flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === "products") {
        return {
          data: [
            {
              id: "p-1",
              name: "Bread",
              base_price: 25000,
              category: { id: "cat-1", name: "Bakery" },
              sku: "BRD001",
              unit: "piece",
              is_active: true,
            },
          ],
          isLoading: false,
        } as any;
      }
      return {
        data: [{ id: "cat-1", name: "Bakery" }],
        isLoading: false,
      } as any;
    });
  });

  afterEach(cleanup);

  it("renders correctly and lists products", () => {
    render(<ProductsPage />);
    expect(
      screen.getByRole("heading", { name: /products/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
    expect(screen.getByText("Bakery")).toBeInTheDocument();
    expect(screen.getByText("25000 ₫")).toBeInTheDocument();
  });

  it("handles Loading state", () => {
    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === "products") {
        return { data: [], isLoading: true } as any;
      }
      return { data: [], isLoading: false } as any;
    });
    render(<ProductsPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("opens and closes the dialog when Cancel is clicked", () => {
    render(<ProductsPage />);
    fireEvent.click(screen.getByRole("button", { name: /add product/i }));
    expect(screen.getByText("New Product")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("New Product")).not.toBeInTheDocument();
  });

  it("submits createProduct successfully", async () => {
    vi.mocked(createProduct).mockResolvedValue({ id: "p-2" } as any);
    const { container } = render(<ProductsPage />);

    fireEvent.click(screen.getByRole("button", { name: /add product/i }));

    const skuInput = container.querySelector('input[name="sku"]')!;
    const nameInput = container.querySelector('input[name="name"]')!;
    const unitInput = container.querySelector('input[name="unit"]')!;
    const priceInput = container.querySelector('input[name="price"]')!;
    const descInput = container.querySelector('input[name="description"]')!;
    const catSelect = container.querySelector('select[name="category_id"]')!;

    fireEvent.change(skuInput, { target: { value: "CAKE001" } });
    fireEvent.change(nameInput, { target: { value: "Sponge Cake" } });
    fireEvent.change(unitInput, { target: { value: "piece" } });
    fireEvent.change(priceInput, { target: { value: "150000" } });
    fireEvent.change(descInput, { target: { value: "Tasty cake" } });
    fireEvent.change(catSelect, { target: { value: "cat-1" } });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalledWith({
        sku: "CAKE001",
        name: "Sponge Cake",
        unit: "piece",
        base_price: 150000,
        description: "Tasty cake",
        category_id: "cat-1",
      });
      expect(mockToast).toHaveBeenCalledWith("Product created");
      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ["products"] });
    });
  });

  it("handles createProduct failure gracefully", async () => {
    vi.mocked(createProduct).mockRejectedValue(new Error("Creation failed"));
    const { container } = render(<ProductsPage />);

    fireEvent.click(screen.getByRole("button", { name: /add product/i }));
    fireEvent.change(container.querySelector('input[name="sku"]')!, {
      target: { value: "SKUERR" },
    });
    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: "Error Prod" },
    });
    fireEvent.change(container.querySelector('input[name="unit"]')!, {
      target: { value: "pc" },
    });
    fireEvent.change(container.querySelector('input[name="price"]')!, {
      target: { value: "100" },
    });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Creation failed", "error");
    });
  });

  it("submits updateProduct successfully when editing", async () => {
    vi.mocked(updateProduct).mockResolvedValue({ id: "p-1" } as any);
    const { container } = render(<ProductsPage />);

    // Click edit button
    fireEvent.click(screen.getByText("✎"));
    expect(screen.getByText("Edit Product")).toBeInTheDocument();

    const nameInput = container.querySelector('input[name="name"]')!;
    fireEvent.change(nameInput, { target: { value: "Premium Bread" } });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalledWith("p-1", {
        name: "Premium Bread",
        description: "",
        unit: "piece",
        base_price: 25000,
      });
      expect(mockToast).toHaveBeenCalledWith("Product updated");
    });
  });

  it("handles updateProduct failure", async () => {
    vi.mocked(updateProduct).mockRejectedValue(
      new Error("Update network error"),
    );
    const { container } = render(<ProductsPage />);

    fireEvent.click(screen.getByText("✎"));
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Update network error", "error");
    });
  });

  it("deletes product successfully", async () => {
    vi.mocked(deleteProduct).mockResolvedValue(null as any);
    render(<ProductsPage />);

    // Click delete button
    fireEvent.click(screen.getByText("🗑"));
    expect(screen.getByText("Delete Product")).toBeInTheDocument();

    // Click confirm delete
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(deleteProduct).toHaveBeenCalledWith("p-1");
      expect(mockToast).toHaveBeenCalledWith("Product deleted");
    });
  });

  it("handles deleteProduct failure", async () => {
    vi.mocked(deleteProduct).mockRejectedValue(new Error("Delete error"));
    render(<ProductsPage />);

    fireEvent.click(screen.getByText("🗑"));
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Delete error", "error");
    });
  });

  it("closes delete product dialog on cancel", () => {
    render(<ProductsPage />);
    fireEvent.click(screen.getByText("🗑"));
    expect(screen.getByText("Delete Product")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("Delete Product")).not.toBeInTheDocument();
  });

  it("closes edit dialog on backdrop / openChange callback", () => {
    render(<ProductsPage />);
    fireEvent.click(screen.getByRole("button", { name: /add product/i }));
    expect(screen.getByText("New Product")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("close-dialog"));
    expect(screen.queryByText("New Product")).not.toBeInTheDocument();
  });
});

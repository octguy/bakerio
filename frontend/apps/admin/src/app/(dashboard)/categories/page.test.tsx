import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useQuery } from "@tanstack/react-query";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@repo/api-client";

const mockToast = vi.fn();
const mockInvalidate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: [
      {
        id: "cat-1",
        name: "Bread",
        slug: "bread",
        sort_order: 1,
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
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
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

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("lucide-react", () => ({
  Plus: () => <span>+</span>,
  Pencil: () => <span>✎</span>,
  Trash2: () => <span>🗑</span>,
  ToggleLeft: () => <span>off</span>,
  ToggleRight: () => <span>on</span>,
}));

import CategoriesPage from "./page";

describe("CategoriesPage CRUD flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockReturnValue({
      data: [
        {
          id: "cat-1",
          name: "Bread",
          slug: "bread",
          sort_order: 1,
          is_active: true,
        },
      ],
      isLoading: false,
    } as any);
  });

  afterEach(cleanup);

  it("renders correctly and lists categories", () => {
    render(<CategoriesPage />);
    expect(
      screen.getByRole("heading", { name: /categories/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
    expect(screen.getByText("bread")).toBeInTheDocument();
  });

  it("handles Loading state", () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: true } as any);
    render(<CategoriesPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("opens and closes the dialog when Cancel is clicked", () => {
    render(<CategoriesPage />);
    fireEvent.click(screen.getByRole("button", { name: /add category/i }));
    expect(screen.getByText("New Category")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("New Category")).not.toBeInTheDocument();
  });

  it("submits createCategory successfully", async () => {
    vi.mocked(createCategory).mockResolvedValue({ id: "cat-2" } as any);
    const { container } = render(<CategoriesPage />);

    fireEvent.click(screen.getByRole("button", { name: /add category/i }));

    const nameInput = container.querySelector('input[name="name"]')!;
    const sortOrderInput = container.querySelector('input[name="sort_order"]')!;

    fireEvent.change(nameInput, { target: { value: "Pastries" } });
    fireEvent.change(sortOrderInput, { target: { value: "2" } });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(createCategory).toHaveBeenCalledWith({
        name: "Pastries",
        sort_order: 2,
      });
      expect(mockToast).toHaveBeenCalledWith("Category created");
      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ["categories"] });
    });
  });

  it("handles createCategory failure gracefully", async () => {
    vi.mocked(createCategory).mockRejectedValue(
      new Error("Category creation failed"),
    );
    const { container } = render(<CategoriesPage />);

    fireEvent.click(screen.getByRole("button", { name: /add category/i }));
    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: "Failing Category" },
    });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        "Category creation failed",
        "error",
      );
    });
  });

  it("submits updateCategory successfully when editing", async () => {
    vi.mocked(updateCategory).mockResolvedValue({ id: "cat-1" } as any);
    const { container } = render(<CategoriesPage />);

    // Click edit button
    fireEvent.click(screen.getByText("✎"));
    expect(screen.getByText("Edit Category")).toBeInTheDocument();

    const nameInput = container.querySelector('input[name="name"]')!;
    fireEvent.change(nameInput, { target: { value: "Sourdough Bread" } });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(updateCategory).toHaveBeenCalledWith("cat-1", {
        name: "Sourdough Bread",
        sort_order: 1,
        is_active: true,
      });
      expect(mockToast).toHaveBeenCalledWith("Category updated");
    });
  });

  it("handles updateCategory failure", async () => {
    vi.mocked(updateCategory).mockRejectedValue(
      new Error("Update network error"),
    );
    const { container } = render(<CategoriesPage />);

    fireEvent.click(screen.getByText("✎"));
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Update network error", "error");
    });
  });

  it("deletes category successfully", async () => {
    vi.mocked(deleteCategory).mockResolvedValue(null as any);
    render(<CategoriesPage />);

    // Click delete button
    fireEvent.click(screen.getByText("🗑"));
    expect(screen.getByText("Delete Category")).toBeInTheDocument();

    // Click confirm delete
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(deleteCategory).toHaveBeenCalledWith("cat-1");
      expect(mockToast).toHaveBeenCalledWith("Category deleted");
    });
  });

  it("handles deleteCategory failure", async () => {
    vi.mocked(deleteCategory).mockRejectedValue(new Error("Delete error"));
    render(<CategoriesPage />);

    fireEvent.click(screen.getByText("🗑"));
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Delete error", "error");
    });
  });

  it("closes delete category dialog on cancel", () => {
    render(<CategoriesPage />);
    fireEvent.click(screen.getByText("🗑"));
    expect(screen.getByText("Delete Category")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("Delete Category")).not.toBeInTheDocument();
  });

  it("closes edit dialog on backdrop / openChange callback", () => {
    render(<CategoriesPage />);
    fireEvent.click(screen.getByRole("button", { name: /add category/i }));
    expect(screen.getByText("New Category")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("close-dialog"));
    expect(screen.queryByText("New Category")).not.toBeInTheDocument();
  });
});

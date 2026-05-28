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
  createBranch,
  updateBranch,
  updateBranchStatus,
  deleteBranch,
} from "@repo/api-client";

const mockToast = vi.fn();
const mockInvalidate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: [
      {
        id: "br-1",
        name: "Downtown",
        address: "123 Main St",
        region: "north",
        status: "active",
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
  getBranches: vi.fn(),
  createBranch: vi.fn(),
  updateBranch: vi.fn(),
  updateBranchStatus: vi.fn(),
  deleteBranch: vi.fn(),
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

import BranchesPage from "./page";

describe("BranchesPage CRUD flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockReturnValue({
      data: [
        {
          id: "br-1",
          name: "Downtown",
          address: "123 Main St",
          region: "north",
          status: "active",
        },
      ],
      isLoading: false,
    } as any);
  });

  afterEach(cleanup);

  it("renders correctly and lists branches", () => {
    render(<BranchesPage />);
    expect(
      screen.getByRole("heading", { name: /branches/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Downtown")).toBeInTheDocument();
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
  });

  it("handles Loading state", () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: true } as any);
    render(<BranchesPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("opens and closes the dialog when Cancel is clicked", () => {
    render(<BranchesPage />);
    fireEvent.click(screen.getByRole("button", { name: /add branch/i }));
    expect(screen.getByText("New Branch")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("New Branch")).not.toBeInTheDocument();
  });

  it("submits createBranch successfully", async () => {
    vi.mocked(createBranch).mockResolvedValue({ id: "br-2" } as any);
    const { container } = render(<BranchesPage />);

    fireEvent.click(screen.getByRole("button", { name: /add branch/i }));

    const nameInput = container.querySelector('input[name="name"]')!;
    const addrInput = container.querySelector('input[name="address"]')!;

    fireEvent.change(nameInput, { target: { value: "Saigon Centre" } });
    fireEvent.change(addrInput, { target: { value: "District 1" } });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(createBranch).toHaveBeenCalledWith({
        name: "Saigon Centre",
        address: "District 1",
      });
      expect(mockToast).toHaveBeenCalledWith("Branch created");
      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ["branches"] });
    });
  });

  it("handles createBranch failure gracefully", async () => {
    vi.mocked(createBranch).mockRejectedValue(
      new Error("Server error creation"),
    );
    const { container } = render(<BranchesPage />);

    fireEvent.click(screen.getByRole("button", { name: /add branch/i }));
    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: "Failing Branch" },
    });
    fireEvent.change(container.querySelector('input[name="address"]')!, {
      target: { value: "Addr" },
    });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Server error creation", "error");
    });
  });

  it("submits updateBranch successfully when editing", async () => {
    vi.mocked(updateBranch).mockResolvedValue({ id: "br-1" } as any);
    const { container } = render(<BranchesPage />);

    // Click edit button
    fireEvent.click(screen.getByText("✎"));
    expect(screen.getByText("Edit Branch")).toBeInTheDocument();

    const nameInput = container.querySelector('input[name="name"]')!;
    fireEvent.change(nameInput, { target: { value: "Downtown Upd" } });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(updateBranch).toHaveBeenCalledWith("br-1", {
        name: "Downtown Upd",
        address: "123 Main St",
      });
      expect(mockToast).toHaveBeenCalledWith("Branch updated");
    });
  });

  it("handles updateBranch failure", async () => {
    vi.mocked(updateBranch).mockRejectedValue(
      new Error("Update network error"),
    );
    const { container } = render(<BranchesPage />);

    fireEvent.click(screen.getByText("✎"));
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Update network error", "error");
    });
  });

  it("toggles branch status", async () => {
    vi.mocked(updateBranchStatus).mockResolvedValue(null as any);
    render(<BranchesPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /deactivate downtown/i }),
    );

    await waitFor(() => {
      expect(updateBranchStatus).toHaveBeenCalledWith("br-1", "inactive");
      expect(mockToast).toHaveBeenCalledWith("Branch status updated");
      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ["branches"] });
    });
  });

  it("handles branch status update failure", async () => {
    vi.mocked(updateBranchStatus).mockRejectedValue(
      new Error("Status update failed"),
    );
    render(<BranchesPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /deactivate downtown/i }),
    );

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Status update failed", "error");
    });
  });

  it("deletes branch successfully", async () => {
    vi.mocked(deleteBranch).mockResolvedValue(null as any);
    render(<BranchesPage />);

    // Click delete button
    fireEvent.click(screen.getByText("🗑"));
    expect(screen.getByText("Delete Branch")).toBeInTheDocument();

    // Click confirm delete
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(deleteBranch).toHaveBeenCalledWith("br-1");
      expect(mockToast).toHaveBeenCalledWith("Branch deleted");
    });
  });

  it("handles deleteBranch failure", async () => {
    vi.mocked(deleteBranch).mockRejectedValue(new Error("Delete error"));
    render(<BranchesPage />);

    fireEvent.click(screen.getByText("🗑"));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Delete error", "error");
    });
  });

  it("closes delete branch dialog on cancel", () => {
    render(<BranchesPage />);
    fireEvent.click(screen.getByText("🗑"));
    expect(screen.getByText("Delete Branch")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("Delete Branch")).not.toBeInTheDocument();
  });

  it("closes edit dialog on backdrop / openChange callback", () => {
    render(<BranchesPage />);
    fireEvent.click(screen.getByRole("button", { name: /add branch/i }));
    expect(screen.getByText("New Branch")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("close-dialog"));
    expect(screen.queryByText("New Branch")).not.toBeInTheDocument();
  });
});

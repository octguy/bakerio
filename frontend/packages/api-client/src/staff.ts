// Staff directory — sourced from the real Go backend.
//
// Global staff comes from GET /staff. Branch staff remains sourced from
// GET /branch/:id/members so branch-scoped pages keep their dedicated endpoint.
//
// Fields the backend doesn't track (shift, status, start year, avatar accent)
// are derived deterministically from what's available — they're cosmetic and
// only used for the dashboard look. Wire them to real timeclock data once a
// backend endpoint exists.

import {
  getBranches,
  getBranchMembers,
  getStaffUsers,
  getStaffUsersPage,
  type BranchMember,
  type StaffUser,
} from "./client";
import type { Branch } from "./types";

export type StaffStatus = "clocked-in" | "on-break" | "late" | "off";
export type StaffRole =
  | "Manager"
  | "Co-founder"
  | "Head baker"
  | "Pastry chef"
  | "Rider"
  | "Barista";

export interface StaffMember {
  userId: string;
  email: string;
  name: string;
  initial: string;
  role: StaffRole | string;
  roleId?: string;
  branchId?: string;
  branch: string;
  start: string;
  status: StaffStatus;
  shift: string;
  /** UI accent — drives avatar colour. */
  accent: "cinnamon" | "golden" | "sage" | "honey" | "rose";
}

export interface StaffPage {
  items: StaffMember[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface StaffRoleOption {
  value: string;
  label: string;
}

const STAFF_ROLE_OPTIONS: StaffRoleOption[] = [
  { value: "branch_manager", label: "Branch Manager" },
  { value: "branch_staff", label: "Branch Staff" },
  { value: "product_manager", label: "Product Manager" },
];

// Backend role IDs → friendly labels rendered in the staff grid.
const ROLE_DISPLAY: Record<string, string> = {
  super_admin: "Co-founder",
  product_manager: "Manager",
  branch_manager: "Manager",
  staff: "Barista",
  member: "Barista",
  customer: "—",
};

const ACCENT_BY_ROLE: Record<string, StaffMember["accent"]> = {
  Manager: "cinnamon",
  "Head baker": "golden",
  "Pastry chef": "rose",
  Rider: "honey",
  Barista: "sage",
  "Co-founder": "sage",
};

function initialOf(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return c || "?";
}

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function displayRole(roles: string[]): string {
  const first = roles[0];
  if (!first) return "—";
  return ROLE_DISPLAY[first] ?? titleCase(first);
}

function toStaff(
  member: BranchMember | StaffUser,
  branchName: string,
): StaffMember {
  const roleId = member.roles[0];
  const role = displayRole(member.roles);
  return {
    userId: member.user_id,
    email: member.email,
    name: member.display_name,
    initial: initialOf(member.display_name),
    role,
    roleId,
    branchId: "branch_id" in member ? member.branch_id : undefined,
    branch: branchName,
    start: "—",
    status: "clocked-in",
    shift: "—",
    accent: ACCENT_BY_ROLE[role] ?? "sage",
  };
}

export async function getStaff(
  role?: StaffRole | string,
  q?: string,
  cachedBranches?: Branch[],
): Promise<StaffMember[]> {
  const [staff, branches] = await Promise.all([
    getStaffUsers({ q }),
    cachedBranches ? Promise.resolve(cachedBranches) : getBranches(),
  ]);
  const branchNames = new Map(branches.map((b) => [b.id, b.name]));
  const list = staff.map((m) =>
    toStaff(
      m,
      m.branch_id
        ? (branchNames.get(m.branch_id) ?? "Unassigned")
        : "Unassigned",
    ),
  );
  return role ? list.filter((s) => s.role === role) : list;
}

export async function getStaffPage(opts?: {
  q?: string;
  page?: number;
  size?: number;
  branches?: Branch[];
}): Promise<StaffPage> {
  const [staffPage, branches] = await Promise.all([
    getStaffUsersPage({ q: opts?.q, page: opts?.page, size: opts?.size }),
    opts?.branches ? Promise.resolve(opts.branches) : getBranches(),
  ]);
  const branchNames = new Map(branches.map((b) => [b.id, b.name]));
  return {
    items: staffPage.items.map((member) =>
      toStaff(
        member,
        member.branch_id ? (branchNames.get(member.branch_id) ?? "Unassigned") : "Unassigned",
      ),
    ),
    total: staffPage.total,
    page: staffPage.page,
    size: staffPage.size,
    totalPages: staffPage.total_pages,
  };
}

export async function getBranchStaff(
  branchId: string,
  branchName: string,
  role?: StaffRole | string,
): Promise<StaffMember[]> {
  const members = await getBranchMembers(branchId);
  const staff = members.map((m) => toStaff(m, branchName));
  return role ? staff.filter((s) => s.role === role) : staff;
}

export function getStaffCountsFromList(staff: StaffMember[]): {
  total: number;
  onShift: number;
  byRole: Record<string, number>;
} {
  const byRole: Record<string, number> = { All: staff.length };
  for (const s of staff) {
    byRole[s.role] = (byRole[s.role] ?? 0) + 1;
  }
  return {
    total: staff.length,
    // Real status data isn't tracked yet; treat every active member as on shift.
    onShift: staff.length,
    byRole,
  };
}

export async function getStaffCounts(): Promise<{
  total: number;
  onShift: number;
  byRole: Record<string, number>;
}> {
  const staff = await getStaff();
  return getStaffCountsFromList(staff);
}

export async function getStaffRoleOptions(): Promise<StaffRoleOption[]> {
  return STAFF_ROLE_OPTIONS;
}

// Staff directory — sourced from the real Go backend.
//
// The Go side has no flat "list users" endpoint. Membership is the source of
// truth, so we fan out: GET /branch → for each branch GET /branch/:id/members
// and flatten the result into the StaffMember[] shape the admin UI expects.
//
// Fields the backend doesn't track (shift, status, start year, avatar accent)
// are derived deterministically from what's available — they're cosmetic and
// only used for the dashboard look. Wire them to real timeclock data once a
// backend endpoint exists.

import { getBranches, getBranchMembers, type BranchMember } from "./client";

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
  branch: string;
  start: string;
  status: StaffStatus;
  shift: string;
  /** UI accent — drives avatar colour. */
  accent: "cinnamon" | "golden" | "sage" | "honey" | "rose";
}

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

function toStaff(member: BranchMember, branchName: string): StaffMember {
  const role = displayRole(member.roles);
  return {
    userId: member.user_id,
    email: member.email,
    name: member.display_name,
    initial: initialOf(member.display_name),
    role,
    branch: branchName,
    start: "—",
    status: "clocked-in",
    shift: "—",
    accent: ACCENT_BY_ROLE[role] ?? "sage",
  };
}

export async function getStaff(
  role?: StaffRole | string,
): Promise<StaffMember[]> {
  const branches = await getBranches();
  const groups = await Promise.all(
    branches.map(async (b) => {
      const members = await getBranchMembers(b.id).catch(
        () => [] as BranchMember[],
      );
      return members.map((m) => toStaff(m, b.name));
    }),
  );
  const flat = groups.flat();
  return role ? flat.filter((s) => s.role === role) : flat;
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

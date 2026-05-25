// Audit §III admin/staff: backend has POST /users but no list-users endpoint.
// Mock added so admin Staff page can list + show shifts/clock-in.

export type StaffStatus = "clocked-in" | "on-break" | "late" | "off";
export type StaffRole = "Manager" | "Co-founder" | "Head baker" | "Pastry chef" | "Rider" | "Barista";

export interface StaffMember {
  email: string;
  name: string;
  initial: string;
  role: StaffRole;
  branch: string;
  start: string;
  status: StaffStatus;
  shift: string;
  /** UI accent — drives avatar colour. */
  accent: "cinnamon" | "golden" | "sage" | "honey" | "rose";
}

export const mockStaff: StaffMember[] = [
  { email: "thinh@bakerio.vn",  name: "Thinh Nguyễn", initial: "T", role: "Manager",     branch: "Lê Lợi",     start: "2024", status: "clocked-in", shift: "06:00 — 14:00", accent: "cinnamon" },
  { email: "linh@bakerio.vn",   name: "Linh Phạm",    initial: "L", role: "Head baker",  branch: "Central",    start: "2024", status: "clocked-in", shift: "04:00 — 12:00", accent: "golden" },
  { email: "khoa@bakerio.vn",   name: "Khoa Trần",    initial: "K", role: "Co-founder",  branch: "—",          start: "2024", status: "off",        shift: "—",             accent: "sage" },
  { email: "hung@bakerio.vn",   name: "Hùng Lê",      initial: "H", role: "Rider",       branch: "Lê Lợi",     start: "2024", status: "clocked-in", shift: "06:30 — 14:30", accent: "honey" },
  { email: "quan@bakerio.vn",   name: "Quân Đỗ",      initial: "Q", role: "Rider",       branch: "Thảo Điền",  start: "2025", status: "clocked-in", shift: "07:00 — 15:00", accent: "honey" },
  { email: "mai@bakerio.vn",    name: "Mai Lê",       initial: "M", role: "Manager",     branch: "Thảo Điền",  start: "2025", status: "clocked-in", shift: "06:30 — 14:30", accent: "cinnamon" },
  { email: "an@bakerio.vn",     name: "An Vũ",        initial: "A", role: "Manager",     branch: "PMH",        start: "2025", status: "on-break",   shift: "07:00 — 15:00", accent: "cinnamon" },
  { email: "ha@bakerio.vn",     name: "Hà Phạm",      initial: "H", role: "Manager",     branch: "BT",         start: "2025", status: "clocked-in", shift: "07:00 — 15:00", accent: "cinnamon" },
  { email: "phuc@bakerio.vn",   name: "Phúc Trần",    initial: "P", role: "Rider",       branch: "PMH",        start: "2025", status: "late",       shift: "07:00 — 15:00", accent: "rose" },
  { email: "bao@bakerio.vn",    name: "Bảo Đặng",     initial: "B", role: "Pastry chef", branch: "Pasteur",    start: "2025", status: "clocked-in", shift: "04:30 — 12:30", accent: "rose" },
  { email: "hang@bakerio.vn",   name: "Ms. Hằng",     initial: "H", role: "Pastry chef", branch: "Central",    start: "2025", status: "clocked-in", shift: "04:00 — 12:00", accent: "rose" },
  { email: "khanh@bakerio.vn",  name: "Khánh Vũ",     initial: "K", role: "Barista",     branch: "TB",         start: "2025", status: "off",        shift: "—",             accent: "sage" },
];

export async function getStaff(role?: StaffRole): Promise<StaffMember[]> {
  await new Promise((r) => setTimeout(r, 120));
  return role ? mockStaff.filter((s) => s.role === role) : mockStaff;
}

export async function getStaffCounts(): Promise<{
  total: number;
  onShift: number;
  byRole: Record<"All" | StaffRole, number>;
}> {
  await new Promise((r) => setTimeout(r, 60));
  const total = 46; // total payroll per design copy; mock list is a sample
  const onShift = mockStaff.filter((s) => s.status === "clocked-in").length + 16;
  return {
    total,
    onShift,
    byRole: {
      All: total,
      Manager: 8,
      "Co-founder": 2,
      "Head baker": 4,
      "Pastry chef": 6,
      Rider: 11,
      Barista: 9,
    },
  };
}

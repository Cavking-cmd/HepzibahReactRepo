const ROLE_PRIORITY = [
  "AccountsAdmin",
  "Admin",
  "AccountsOfficer",
  "Pastor",
  "ChurchMember",
  "AttendanceOfficer",
  "FellowshipLeader",
  "InventoryOfficer",
];

const ALL_ROLES = [...ROLE_PRIORITY];

const ROLE_ROUTE: Record<string, string> = {
  AccountsAdmin: "/admin",
  Admin: "/admin",
  AccountsOfficer: "/accounts-officer",
  Pastor: "/pastor",
  ChurchMember: "/member",
  AttendanceOfficer: "/attendance-officer",
  FellowshipLeader: "/fellowship-leader",
  InventoryOfficer: "/inventory-officer",
};

export { ALL_ROLES };

export function routeForRoles(roles: string[]): string {
  const primary = ROLE_PRIORITY.find((r) => roles.includes(r));
  return ROLE_ROUTE[primary ?? ""] ?? "/login";
}

const ROLE_PRIORITY = ["Admin", "AttendanceOfficer", "FellowshipLeader", "InventoryOfficer", "Viewer"];

const ALL_ROLES = [...ROLE_PRIORITY];

const ROLE_ROUTE: Record<string, string> = {
  Admin: "/admin",
  AttendanceOfficer: "/attendance-officer",
  FellowshipLeader: "/fellowship-leader",
  InventoryOfficer: "/inventory-officer",
  Viewer: "/viewer",
};

export { ALL_ROLES };

export function routeForRoles(roles: string[]): string {
  const primary = ROLE_PRIORITY.find((r) => roles.includes(r));
  return ROLE_ROUTE[primary ?? "Viewer"] ?? "/viewer";
}

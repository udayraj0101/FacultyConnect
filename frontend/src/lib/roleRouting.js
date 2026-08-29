/**
 * Role-based portal routing. Each role has one home portal; user is redirected
 * to their home on login and when hitting `/` or any route they can't access.
 */

export const ROLE_HOME = {
  Faculty: '/home',
  CollegeAdmin: '/admin/college',
  OpportunityOrganizer: '/home', // treated as Faculty for now until org portal exists
  PlatformAdmin: '/admin/platform',
};

export function getDefaultPathForRole(role) {
  return ROLE_HOME[role] || '/home';
}

export type Role = "writer" | "director" | "actor" | "stage_manager" | "viewer"

export const ALL_ROLES: Role[] = ["writer", "director", "actor", "stage_manager", "viewer"]

export const ROLE_LABELS: Record<Role, string> = {
  writer: "نویسنده",
  director: "کارگردان",
  actor: "بازیگر",
  stage_manager: "مدیر صحنه",
  viewer: "بیننده",
}

export function hasRole(roles: string[], required: Role): boolean {
  return roles.includes(required)
}

export function hasAnyRole(roles: string[], required: Role[]): boolean {
  return required.some((r) => roles.includes(r))
}

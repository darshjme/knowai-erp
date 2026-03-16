// Role hierarchy levels - higher number = higher authority
export const ROLE_LEVEL: Record<string, number> = {
  CTO: 100, CEO: 98, CFO: 90, BRAND_FACE: 85,
  ADMIN: 80, HR: 75, PRODUCT_OWNER: 70, BRAND_PARTNER: 65,
  SR_ACCOUNTANT: 50, SR_DEVELOPER: 50, SR_GRAPHIC_DESIGNER: 50, SR_EDITOR: 50,
  SR_CONTENT_STRATEGIST: 50, SR_SCRIPT_WRITER: 50, SR_BRAND_STRATEGIST: 50,
  JR_ACCOUNTANT: 30, JR_DEVELOPER: 30, JR_GRAPHIC_DESIGNER: 30, JR_EDITOR: 30,
  JR_CONTENT_STRATEGIST: 30, JR_SCRIPT_WRITER: 30, JR_BRAND_STRATEGIST: 30,
  DRIVER: 20, GUY: 15, OFFICE_BOY: 10,
};

export function getRoleLevel(role: string): number {
  return ROLE_LEVEL[role] || 0;
}

export function isHigherOrEqual(actorRole: string, targetRole: string): boolean {
  return getRoleLevel(actorRole) >= getRoleLevel(targetRole);
}

export function canManage(actorRole: string, targetRole: string): boolean {
  return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}

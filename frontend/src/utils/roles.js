import { UserRole } from './constants';

export const isAdmin = (user) => user?.role === UserRole.ADMIN;
export const isMgrPlus = (user) => user?.role === UserRole.ADMIN || user?.role === UserRole.ASSET_MANAGER;
export const isDeptHeadPlus = (user) => isMgrPlus(user) || user?.role === UserRole.DEPARTMENT_HEAD;

export function canSeeNavItem(item, user) {
  if (!item.roles) return true;
  return item.roles.includes(user?.role);
}

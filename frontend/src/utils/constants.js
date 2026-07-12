// Mirrors backend/app/models/enums.py — values are frozen per design.md Section 3.1.

export const UserRole = {
  ADMIN: 'ADMIN',
  ASSET_MANAGER: 'ASSET_MANAGER',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  EMPLOYEE: 'EMPLOYEE',
};

export const ActiveStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' };

export const AssetStatus = {
  AVAILABLE: 'AVAILABLE',
  ALLOCATED: 'ALLOCATED',
  RESERVED: 'RESERVED',
  UNDER_MAINTENANCE: 'UNDER_MAINTENANCE',
  LOST: 'LOST',
  RETIRED: 'RETIRED',
  DISPOSED: 'DISPOSED',
};

export const AssetCondition = { NEW: 'NEW', GOOD: 'GOOD', FAIR: 'FAIR', POOR: 'POOR' };

export const AllocationStatus = { ACTIVE: 'ACTIVE', RETURNED: 'RETURNED' };

export const TransferStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
};

export const BookingStatus = {
  UPCOMING: 'UPCOMING',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const MaintenanceStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  TECHNICIAN_ASSIGNED: 'TECHNICIAN_ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
};

export const MAINTENANCE_KANBAN_COLUMNS = [
  { key: MaintenanceStatus.PENDING, label: 'Pending' },
  { key: MaintenanceStatus.APPROVED, label: 'Approved' },
  { key: MaintenanceStatus.TECHNICIAN_ASSIGNED, label: 'Technician Assigned' },
  { key: MaintenanceStatus.IN_PROGRESS, label: 'In Progress' },
  { key: MaintenanceStatus.RESOLVED, label: 'Resolved' },
];

export const MaintenancePriority = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' };

export const AuditCycleStatus = { OPEN: 'OPEN', CLOSED: 'CLOSED' };

export const AuditVerification = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  MISSING: 'MISSING',
  DAMAGED: 'DAMAGED',
};

export const NotificationType = {
  ASSET_ASSIGNED: 'ASSET_ASSIGNED',
  MAINTENANCE_APPROVED: 'MAINTENANCE_APPROVED',
  MAINTENANCE_REJECTED: 'MAINTENANCE_REJECTED',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_REMINDER: 'BOOKING_REMINDER',
  TRANSFER_APPROVED: 'TRANSFER_APPROVED',
  TRANSFER_REJECTED: 'TRANSFER_REJECTED',
  OVERDUE_RETURN: 'OVERDUE_RETURN',
  AUDIT_DISCREPANCY: 'AUDIT_DISCREPANCY',
};

// Semantic color bucket per status value — used by <StatusBadge>.
export const STATUS_TONE = {
  ACTIVE: 'success',
  AVAILABLE: 'success',
  VERIFIED: 'success',
  APPROVED: 'info',
  RESOLVED: 'success',
  COMPLETED: 'success',
  ONGOING: 'success',
  OPEN: 'success',

  ALLOCATED: 'info',
  UPCOMING: 'info',
  TECHNICIAN_ASSIGNED: 'info',
  REQUESTED: 'warning',
  PENDING: 'warning',
  RESERVED: 'purple',
  IN_PROGRESS: 'purple',

  UNDER_MAINTENANCE: 'warning',
  DAMAGED: 'warning',

  INACTIVE: 'neutral',
  RETURNED: 'neutral',
  RETIRED: 'neutral',
  DISPOSED: 'neutral',
  CLOSED: 'neutral',

  REJECTED: 'danger',
  CANCELLED: 'danger',
  LOST: 'danger',
  MISSING: 'danger',
};

export const PRIORITY_TONE = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: null },
  { to: '/organization', label: 'Organization Setup', roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD] },
  { to: '/assets', label: 'Assets', roles: null },
  { to: '/allocation', label: 'Allocation & Transfer', roles: null },
  { to: '/booking', label: 'Resource Booking', roles: null },
  { to: '/maintenance', label: 'Maintenance', roles: null },
  { to: '/audit', label: 'Audit', roles: null },
  { to: '/reports', label: 'Reports', roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD] },
  { to: '/notifications', label: 'Notifications', roles: null },
];

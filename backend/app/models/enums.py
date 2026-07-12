"""
AssetFlow — Python enum classes mirroring Postgres enum types.

Values are frozen per design.md Section 3.1 — do NOT modify.
"""

import enum


class UserRole(enum.StrEnum):
    ADMIN = "ADMIN"
    ASSET_MANAGER = "ASSET_MANAGER"
    DEPARTMENT_HEAD = "DEPARTMENT_HEAD"
    EMPLOYEE = "EMPLOYEE"


class ActiveStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class AssetStatus(enum.StrEnum):
    AVAILABLE = "AVAILABLE"
    ALLOCATED = "ALLOCATED"
    RESERVED = "RESERVED"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE"
    LOST = "LOST"
    RETIRED = "RETIRED"
    DISPOSED = "DISPOSED"


class AssetCondition(enum.StrEnum):
    NEW = "NEW"
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"


class AllocationStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    RETURNED = "RETURNED"


class TransferStatus(enum.StrEnum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"


class BookingStatus(enum.StrEnum):
    UPCOMING = "UPCOMING"
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class MaintenanceStatus(enum.StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    TECHNICIAN_ASSIGNED = "TECHNICIAN_ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class MaintenancePriority(enum.StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AuditCycleStatus(enum.StrEnum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class AuditVerification(enum.StrEnum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    MISSING = "MISSING"
    DAMAGED = "DAMAGED"


class NotificationType(enum.StrEnum):
    ASSET_ASSIGNED = "ASSET_ASSIGNED"
    MAINTENANCE_APPROVED = "MAINTENANCE_APPROVED"
    MAINTENANCE_REJECTED = "MAINTENANCE_REJECTED"
    BOOKING_CONFIRMED = "BOOKING_CONFIRMED"
    BOOKING_CANCELLED = "BOOKING_CANCELLED"
    BOOKING_REMINDER = "BOOKING_REMINDER"
    TRANSFER_APPROVED = "TRANSFER_APPROVED"
    TRANSFER_REJECTED = "TRANSFER_REJECTED"
    OVERDUE_RETURN = "OVERDUE_RETURN"
    AUDIT_DISCREPANCY = "AUDIT_DISCREPANCY"

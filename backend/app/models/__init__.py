"""
AssetFlow — ORM model re-exports.

Import all models here so `Base.metadata` sees every table when
Alembic or the app factory imports this package.
"""

from app.models.enums import (  # noqa: F401
    ActiveStatus,
    AllocationStatus,
    AssetCondition,
    AssetStatus,
    AuditCycleStatus,
    AuditVerification,
    BookingStatus,
    MaintenancePriority,
    MaintenanceStatus,
    NotificationType,
    TransferStatus,
    UserRole,
)
from app.models.user import User  # noqa: F401
from app.models.department import Department  # noqa: F401
from app.models.asset_category import AssetCategory  # noqa: F401
from app.models.asset import Asset  # noqa: F401
from app.models.allocation import Allocation  # noqa: F401
from app.models.transfer_request import TransferRequest  # noqa: F401
from app.models.booking import Booking  # noqa: F401
from app.models.maintenance_request import MaintenanceRequest  # noqa: F401
from app.models.audit_cycle import AuditCycle  # noqa: F401
from app.models.audit_cycle_auditor import AuditCycleAuditor  # noqa: F401
from app.models.audit_item import AuditItem  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.activity_log import ActivityLog  # noqa: F401

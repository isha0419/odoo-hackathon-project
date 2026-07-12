"""AssetFlow — Activity Logs Router."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps import get_current_user
from app.models.activity_log import ActivityLog
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.activity_logs import ActivityLogOut

router = APIRouter(prefix="/activity-logs", tags=["Activity Logs"])


@router.get("", response_model=List[ActivityLogOut])
def list_activity_logs(
    limit: int = 50,
    offset: int = 0,
    entity_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(ActivityLog).options(joinedload(ActivityLog.actor))
    
    if current_user.role == UserRole.DEPARTMENT_HEAD:
        # Dept Head sees activity by members of their dept or involving their dept
        stmt = stmt.join(User, ActivityLog.actor_user_id == User.id).where(
            User.department_id == current_user.department_id
        )
    elif current_user.role not in (UserRole.ADMIN, UserRole.ASSET_MANAGER):
        # Employee sees their own activity
        stmt = stmt.where(ActivityLog.actor_user_id == current_user.id)

    if entity_id:
        stmt = stmt.where(ActivityLog.entity_id == entity_id)

    stmt = stmt.order_by(ActivityLog.created_at.desc()).limit(limit).offset(offset)
    return db.scalars(stmt).all()

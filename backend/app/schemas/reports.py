"""AssetFlow — Reports schemas (Track D)."""

from pydantic import BaseModel


class UtilizationReport(BaseModel):
    department_id: str
    department_name: str
    total_assets: int
    allocated_assets: int
    utilization_ratio: float


class MostUsedReport(BaseModel):
    asset_id: str
    asset_tag: str
    name: str
    usage_count: int


class IdleReport(BaseModel):
    asset_id: str
    asset_tag: str
    name: str
    days_idle: int


class MaintenanceFreqReport(BaseModel):
    category_name: str
    request_count: int


class DueReport(BaseModel):
    asset_id: str
    asset_tag: str
    name: str
    reason: str


class HeatmapBucket(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday
    hour_of_day: int  # 0-23
    count: int

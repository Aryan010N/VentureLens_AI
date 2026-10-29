from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from enum import Enum

class RiskCategory(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"

class ProjectCreate(BaseModel):
    project_id: Optional[str] = Field(None, description="Unique identifier for the project")
    company_id: Optional[str] = Field(None, description="Associated company ID")
    name: str = Field(..., min_length=1, description="Descriptive project name")
    initial_cost: float = Field(..., gt=0, description="Upfront initial investment cost (Year 0 outlay)")
    cash_flows: List[float] = Field(..., min_length=1, description="Year-by-year expected cash inflows [Year 1, Year 2, ...]")
    risk_category: Optional[RiskCategory] = Field(None, description="Assessed risk tier (Low, Medium, High). If omitted, inferred automatically via ML model.")
    industry_category: str = Field("Software", description="Industry domain (e.g. Software, CleanTech, Energy, Biotech)")
    duration_years: int = Field(..., gt=0, description="Project lifespan in years")

    # Optional historical features for ML models if available
    funding_rounds: Optional[int] = Field(None, ge=0)
    relationships: Optional[int] = Field(None, ge=0)
    milestones: Optional[int] = Field(None, ge=0)
    age_years: Optional[float] = Field(None, ge=0)

    @field_validator("cash_flows")
    def validate_cash_flows(cls, v: List[float], info) -> List[float]:
        if not v or len(v) == 0:
            raise ValueError("Cash flows array must not be empty")
        for val in v:
            if not isinstance(val, (int, float)):
                raise ValueError("All cash flow values must be numeric")
        return [float(x) for x in v]

class ProjectResponse(ProjectCreate):
    project_id: str
    company_id: str
    created_at: Optional[str] = None

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from enum import Enum

class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"

class CompanyCreate(BaseModel):
    company_id: Optional[str] = Field(None, description="Unique identifier for the company")
    total_investment_budget: float = Field(..., gt=0, description="Total capital available for allocation")
    min_cash_reserve: float = Field(0.0, ge=0, description="Minimum reserve cash to maintain")
    loan_facility: float = Field(0.0, ge=0, description="Pre-approved credit / debt facility")
    discount_rate: float = Field(0.12, gt=0, description="Cost of capital as decimal (e.g. 0.12 for 12%) or percentage")
    planning_period_years: int = Field(5, gt=0, description="Horizon for multi-year cash flow evaluation")
    max_acceptable_risk: RiskLevel = Field(RiskLevel.MEDIUM, description="Low, Medium, or High risk tolerance")

    @field_validator("discount_rate")
    def normalize_discount_rate(cls, v: float) -> float:
        if v > 1.0:
            # Convert percentage (e.g. 12 or 12.5) to decimal (0.12 or 0.125)
            v = v / 100.0
        if v <= 0:
            raise ValueError("Discount rate must be strictly positive")
        return v

class CompanyResponse(CompanyCreate):
    company_id: str
    created_at: Optional[str] = None

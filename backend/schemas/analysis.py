from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class CashFlowTimelinePoint(BaseModel):
    year: int
    inflow: float
    outflow: float
    net_cash_flow: float
    cumulative_cash: float
    breaches_reserve: bool

class ProjectFinancials(BaseModel):
    project_id: str
    name: str
    initial_cost: float
    npv: float
    irr: Optional[float]
    payback_period: Optional[float]
    discounted_payback_period: Optional[float]
    profitability_index: float
    break_even_units: Optional[float]
    risk_score: float
    confidence_multiplier: float
    risk_category: str
    industry_category: str
    duration_years: int
    scenarios: Dict[str, List[float]]
    cash_flow_timeline: List[CashFlowTimelinePoint]
    funding_analysis: Dict[str, Any]

class AllocationItem(BaseModel):
    project_id: str
    name: str
    initial_cost: float
    npv: float
    risk_score: float
    risk_category: str
    decision: str  # "Selected" or "Rejected"
    rejection_reason: Optional[str] = None

class OptimizationResponse(BaseModel):
    run_id: str
    company_id: str
    timestamp: str
    total_budget: float
    min_cash_reserve: float
    allocated_budget: float
    unallocated_budget: float
    budget_utilization_pct: float
    selected_count: int
    total_projects: int
    total_npv_optimized: float
    total_npv_naive: float
    optimization_uplift_pct: float
    portfolio_risk_score: float
    allocations: List[AllocationItem]
    naive_selection: List[str]
    ai_recommendation: str
    constraints_summary: Dict[str, Any]

class AnalysisRequest(BaseModel):
    company_id: str

class OptimizationRequest(BaseModel):
    company_id: str
    override_budget: Optional[float] = None
    override_max_risk: Optional[str] = None
    override_discount_rate: Optional[float] = None

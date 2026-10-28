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

class MetricRuleEvaluation(BaseModel):
    rule: str
    description: str
    passed: bool
    actual: str
    threshold: str

class YearByYearPoint(BaseModel):
    year: int
    inflow: float
    discount_factor: float
    present_value: float
    cumulative_cash_flow: float
    discounted_cumulative_cash_flow: float

class WorkedCalculations(BaseModel):
    payback: str
    npv: str
    bcr: str
    roi: str
    contingency: str

class AllocationItem(BaseModel):
    project_id: str = ""
    name: str = ""
    selected: bool = True
    rejection_reason: Optional[str] = None
    
    # Financial outputs from metrics.py
    initial_cost: float = 0.0
    contingency_pct: float = 10.0
    contingency_amount: float = 0.0
    total_investment: float = 0.0
    total_benefits: float = 0.0
    net_benefit: float = 0.0
    pv_of_benefits: float = 0.0
    discount_factors: List[float] = []
    npv: float = 0.0
    bcr: float = 0.0
    roi_percent: float = 0.0
    annual_avg_return_percent: float = 0.0
    irr_percent: Optional[float] = None
    simple_payback_years: Optional[float] = None
    discounted_payback_years: Optional[float] = None
    cumulative_cash_flow: List[float] = []
    discounted_cumulative_cash_flow: List[float] = []
    break_even_year: Optional[int] = None
    allocated_amount: float = 0.0
    share_of_budget_percent: float = 0.0
    decision: str = "ACCEPT"  # "ACCEPT" or "REJECT"
    rules: List[MetricRuleEvaluation] = []
    interpretation: str = ""
    worked_calculations: Optional[WorkedCalculations] = None
    year_by_year_table: List[YearByYearPoint] = []
    
    # Metadata
    risk_category: str = "Medium"
    risk_score: float = 0.50
    industry_category: str = "General"
    lifespan: int = 5

    def __init__(self, **data):
        # Backward compatibility for legacy runs stored in Firestore
        if "selected" not in data:
            data["selected"] = data.get("decision") in ["Selected", "ACCEPT"]
        if "total_investment" not in data or data["total_investment"] == 0.0:
            data["total_investment"] = float(data.get("initial_cost", 0.0))
        super().__init__(**data)

class PortfolioSummary(BaseModel):
    total_budget: float
    total_allocated: float
    unallocated_cash: float
    min_cash_reserve: float
    loan_facility: float
    loan_facility_used: float
    portfolio_npv: float
    portfolio_roi_percent: float
    portfolio_bcr: float
    weighted_average_payback: Optional[float] = None

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
    portfolio_summary: Optional[PortfolioSummary] = None

class AnalysisRequest(BaseModel):
    company_id: str

class OptimizationRequest(BaseModel):
    company_id: str
    override_budget: Optional[float] = None
    override_max_risk: Optional[str] = None
    override_discount_rate: Optional[float] = None
    contingency_pct: Optional[float] = None

export interface CompanyData {
  company_id: string;
  total_investment_budget: number;
  min_cash_reserve: number;
  loan_facility: number;
  discount_rate: number;
  planning_period_years: number;
  max_acceptable_risk: "Low" | "Medium" | "High";
  created_at?: string;
}

export interface ProjectData {
  project_id?: string;
  company_id?: string;
  name: string;
  initial_cost: number;
  cash_flows: number[];
  risk_category: "Low" | "Medium" | "High";
  industry_category: string;
  duration_years: number;
  funding_rounds?: number;
  relationships?: number;
  milestones?: number;
  age_years?: number;
  created_at?: string;
}

export interface CashFlowTimelinePoint {
  year: number;
  inflow: number;
  outflow: number;
  net_cash_flow: number;
  cumulative_cash: number;
  breaches_reserve: boolean;
}

export interface ProjectFinancials {
  project_id: string;
  name: string;
  initial_cost: number;
  npv: number;
  irr: number | null;
  payback_period: number | null;
  discounted_payback_period: number | null;
  profitability_index: number;
  break_even_units: number | null;
  risk_score: number;
  confidence_multiplier: number;
  risk_category: string;
  industry_category: string;
  duration_years: number;
  scenarios: {
    expected: number[];
    optimistic: number[];
    pessimistic: number[];
  };
  cash_flow_timeline: CashFlowTimelinePoint[];
  funding_analysis: {
    total_cost: number;
    internal_equity_allocated: number;
    loan_required: number;
    unfunded_gap: number;
    annual_interest_expense: number;
    borrowing_ratio_pct: number;
    fully_funded: boolean;
  };
}

export interface AllocationItem {
  project_id: string;
  name: string;
  initial_cost: number;
  npv: number;
  risk_score: number;
  risk_category: string;
  decision: "Selected" | "Rejected";
  rejection_reason?: string | null;
}

export interface OptimizationResult {
  run_id: string;
  company_id: string;
  timestamp: string;
  total_budget: number;
  min_cash_reserve: number;
  allocated_budget: number;
  unallocated_budget: number;
  budget_utilization_pct: number;
  selected_count: number;
  total_projects: number;
  total_npv_optimized: number;
  total_npv_naive: number;
  optimization_uplift_pct: number;
  portfolio_risk_score: number;
  allocations: AllocationItem[];
  naive_selection: string[];
  ai_recommendation: string;
  constraints_summary: {
    budget: number;
    min_cash_reserve: number;
    max_acceptable_risk: string;
    discount_rate: number;
  };
}

export interface MLMetrics {
  dataset_slug: string;
  dataset_name: string;
  train_samples: number;
  test_samples: number;
  features: string[];
  revenue_confidence_model: {
    algorithm: string;
    r2_score: number;
    mae: number;
    rmse: number;
  };
  risk_classifier_model: {
    algorithm: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    roc_auc: number;
  };
  disclaimer: string;
}

export interface CompanyData {
  company_id: string;
  total_investment_budget: number;
  min_cash_reserve: number;
  loan_facility: number;
  discount_rate: number;
  planning_period_years: number;
  max_acceptable_risk: "Low" | "Medium" | "High";
  contingency_pct?: number;
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

export interface MetricRuleEvaluation {
  rule: string;
  description: string;
  passed: boolean;
  actual: string;
  threshold: string;
}

export interface YearByYearPoint {
  year: number;
  inflow: number;
  discount_factor: number;
  present_value: number;
  cumulative_cash_flow: number;
  discounted_cumulative_cash_flow: number;
}

export interface WorkedCalculations {
  payback: string;
  npv: string;
  bcr: string;
  roi: string;
  contingency: string;
}

export interface AllocationItem {
  project_id: string;
  name: string;
  selected: boolean;
  rejection_reason?: string | null;

  // Financial metrics computed by metrics.py
  initial_cost: number;
  contingency_pct: number;
  contingency_amount: number;
  total_investment: number;
  total_benefits: number;
  net_benefit: number;
  pv_of_benefits: number;
  discount_factors: number[];
  npv: number;
  bcr: number;
  roi_percent: number;
  annual_avg_return_percent: number;
  irr_percent: number | null;
  simple_payback_years: number | null;
  discounted_payback_years: number | null;
  cumulative_cash_flow: number[];
  discounted_cumulative_cash_flow: number[];
  break_even_year: number | null;
  allocated_amount: number;
  share_of_budget_percent: number;
  decision: "ACCEPT" | "REJECT" | string;
  rules: MetricRuleEvaluation[];
  interpretation: string;
  worked_calculations?: WorkedCalculations;
  year_by_year_table: YearByYearPoint[];

  // Metadata
  risk_category: string;
  risk_score: number;
  industry_category: string;
  lifespan?: number;
}

export interface PortfolioSummary {
  total_budget: number;
  total_allocated: number;
  unallocated_cash: number;
  min_cash_reserve: number;
  loan_facility: number;
  loan_facility_used: number;
  portfolio_npv: number;
  portfolio_roi_percent: number;
  portfolio_bcr: number;
  weighted_average_payback: number | null;
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
    contingency_pct?: number;
    loan_facility?: number;
  };
  portfolio_summary?: PortfolioSummary;
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

export interface TestCaseResult {
  id: string;
  name: string;
  scenario: string;
  inputs: Record<string, any>;
  target_metric: string;
  expected: string;
  actual: string;
  passed: boolean;
  worked_formula: string;
}

export interface TestMetricsResponse {
  suite: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  all_passed: boolean;
  execution_time_ms: number;
  test_cases: TestCaseResult[];
}

export interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  company_id: string;
  token?: string;
  role?: string;
}

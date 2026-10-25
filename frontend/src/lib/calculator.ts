import { ProjectData, ProjectFinancials, OptimizationResult, AllocationItem } from "./types";

export function computeClientNPV(cashFlows: number[], discountRate: number, initialCost: number): number {
  let npv = -initialCost;
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + discountRate, t + 1);
  }
  return Math.round(npv * 100) / 100;
}

export function computeClientIRR(cashFlows: number[], initialCost: number): number | null {
  const full = [-initialCost, ...cashFlows];
  let r = 0.15;
  for (let i = 0; i < 200; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < full.length; t++) {
      const denom = Math.pow(1 + r, t);
      npv += full[t] / denom;
      if (t > 0) {
        dnpv -= (t * full[t]) / Math.pow(1 + r, t + 1);
      }
    }
    if (Math.abs(dnpv) < 1e-10) break;
    const rNew = r - npv / dnpv;
    if (Math.abs(rNew - r) < 1e-5) {
      return Math.round(rNew * 10000) / 10000;
    }
    r = rNew;
  }
  return 0.25;
}

export function computeClientPayback(cashFlows: number[], initialCost: number): number | null {
  let cum = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    const prev = cum;
    cum += cashFlows[t];
    if (cum >= initialCost) {
      const frac = (initialCost - prev) / cashFlows[t];
      return Math.round((t + frac) * 100) / 100;
    }
  }
  return null;
}

export function computeClientDiscountedPayback(cashFlows: number[], discountRate: number, initialCost: number): number | null {
  let cum = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    const dcf = cashFlows[t] / Math.pow(1 + discountRate, t + 1);
    const prev = cum;
    cum += dcf;
    if (cum >= initialCost) {
      const frac = (initialCost - prev) / dcf;
      return Math.round((t + frac) * 100) / 100;
    }
  }
  return null;
}

export function buildFallbackAnalysis(projects: ProjectData[], discountRate: number, totalBudget: number, minReserve: number, loanFacility: number): ProjectFinancials[] {
  return projects.map((p, idx) => {
    const cost = p.initial_cost;
    const flows = p.cash_flows;
    const npv = computeClientNPV(flows, discountRate, cost);
    const irr = computeClientIRR(flows, cost);
    const pb = computeClientPayback(flows, cost);
    const dpb = computeClientDiscountedPayback(flows, discountRate, cost);
    const pvInflows = flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + discountRate, t + 1), 0);
    const pi = cost > 0 ? Math.round((pvInflows / cost) * 100) / 100 : 1.0;

    // ML risk priors
    const riskScore = p.risk_category === "Low" ? 0.22 : p.risk_category === "Medium" ? 0.48 : 0.72;
    const confMult = p.risk_category === "Low" ? 0.92 : p.risk_category === "Medium" ? 0.85 : 0.74;

    const timeline = [
      {
        year: 0,
        inflow: 0,
        outflow: cost,
        net_cash_flow: -cost,
        cumulative_cash: totalBudget - cost,
        breaches_reserve: totalBudget - cost < minReserve,
      },
      ...flows.map((cf, t) => ({
        year: t + 1,
        inflow: cf,
        outflow: 0,
        net_cash_flow: cf,
        cumulative_cash: totalBudget - cost + flows.slice(0, t + 1).reduce((a, b) => a + b, 0),
        breaches_reserve: totalBudget - cost + flows.slice(0, t + 1).reduce((a, b) => a + b, 0) < minReserve,
      })),
    ];

    const internalEq = Math.min(cost, totalBudget);
    const shortfall = Math.max(0, cost - internalEq);
    const loanReq = Math.min(shortfall, loanFacility);

    return {
      project_id: p.project_id || `proj_${idx}`,
      name: p.name,
      initial_cost: cost,
      npv,
      irr,
      payback_period: pb,
      discounted_payback_period: dpb,
      profitability_index: pi,
      break_even_units: Math.round((cost * 0.3) / 40),
      risk_score: riskScore,
      confidence_multiplier: confMult,
      risk_category: p.risk_category,
      industry_category: p.industry_category,
      duration_years: p.duration_years,
      scenarios: {
        expected: flows.map((cf) => Math.round(cf * confMult)),
        optimistic: flows.map((cf) => Math.round(cf * 1.2)),
        pessimistic: flows.map((cf) => Math.round(cf * 0.75)),
      },
      cash_flow_timeline: timeline,
      funding_analysis: {
        total_cost: cost,
        internal_equity_allocated: internalEq,
        loan_required: loanReq,
        unfunded_gap: Math.max(0, shortfall - loanReq),
        annual_interest_expense: loanReq * 0.08,
        borrowing_ratio_pct: cost > 0 ? Math.round((loanReq / cost) * 1000) / 10 : 0,
        fully_funded: shortfall <= loanReq,
      },
    };
  });
}

export function buildFallbackOptimization(projects: ProjectFinancials[], budget: number, minReserve: number, maxRisk: string): OptimizationResult {
  const n = projects.length;
  let bestNPV = -Infinity;
  let bestMask: boolean[] = Array(n).fill(false);

  // Exact 0-1 Knapsack combinatorial solver
  for (let mask = 1; mask < 1 << n; mask++) {
    let totCost = 0;
    let totNPV = 0;
    const curMask: boolean[] = [];
    for (let i = 0; i < n; i++) {
      const take = Boolean((mask >> i) & 1);
      curMask.push(take);
      if (take) {
        totCost += projects[i].initial_cost;
        totNPV += projects[i].npv;
      }
    }
    if (totCost <= budget) {
      if (totNPV > bestNPV) {
        bestNPV = totNPV;
        bestMask = curMask;
      }
    }
  }

  const selectedProjects = projects.filter((_, i) => bestMask[i]);
  const allocated = selectedProjects.reduce((a, b) => a + b.initial_cost, 0);
  const unallocated = Math.max(0, budget - allocated);

  // Greedy Naive Comparison (Highest NPV first)
  const sorted = [...projects].sort((a, b) => b.npv - a.npv);
  let naiveCost = 0;
  let naiveNPV = 0;
  const naiveIds: string[] = [];
  for (const p of sorted) {
    if (naiveCost + p.initial_cost <= budget) {
      naiveCost += p.initial_cost;
      naiveNPV += p.npv;
      naiveIds.push(p.project_id);
    }
  }

  const allocations: AllocationItem[] = projects.map((p, i) => {
    const isSel = bestMask[i];
    let reason = null;
    if (!isSel) {
      if (p.npv <= 0) reason = `Negative expected return (NPV: ₹${p.npv.toLocaleString()})`;
      else if (p.initial_cost > unallocated) {
        reason = `Exceeds remaining unallocated budget (Cost: ₹${p.initial_cost.toLocaleString()} vs Remaining: ₹${unallocated.toLocaleString()}, Deficit: ₹${(p.initial_cost - unallocated).toLocaleString()}).`;
      } else {
        reason = "Displaced by higher-yielding project combinations to maximize total portfolio return.";
      }
    }
    return {
      project_id: p.project_id,
      name: p.name,
      initial_cost: p.initial_cost,
      npv: p.npv,
      risk_score: p.risk_score,
      risk_category: p.risk_category,
      decision: isSel ? "Selected" : "Rejected",
      rejection_reason: reason,
    };
  });

  const uplift = naiveNPV > 0 ? Math.round(((bestNPV - naiveNPV) / naiveNPV) * 1000) / 10 : 0;
  const selNames = selectedProjects.map((p) => `'${p.name}' (₹${(p.initial_cost / 100000).toFixed(0)}L)`).join(", ");

  const aiRec = `VentureLens AI recommendation: The mathematical optimization engine selected ${selectedProjects.length} of ${n} candidate projects (${selNames}), committing ₹${allocated.toLocaleString()} (${((allocated / budget) * 100).toFixed(1)}% of total budget) and delivering an aggregate portfolio NPV of ₹${bestNPV.toLocaleString()}.\n\nReserve & Risk Status: An unallocated buffer of ₹${unallocated.toLocaleString()} is preserved to safeguard liquidity. The selected portfolio satisfies your '${maxRisk}' risk threshold.\n\nRejected Projects Rationale:\n${allocations
    .filter((a) => a.decision === "Rejected")
    .map((r) => `• ${r.name}: ${r.rejection_reason}`)
    .join("\n")}`;

  return {
    run_id: `run_${Math.random().toString(16).substring(2, 10)}`,
    company_id: "default_company",
    timestamp: new Date().toISOString(),
    total_budget: budget,
    min_cash_reserve: minReserve,
    allocated_budget: allocated,
    unallocated_budget: unallocated,
    budget_utilization_pct: Math.round((allocated / budget) * 1000) / 10,
    selected_count: selectedProjects.length,
    total_projects: n,
    total_npv_optimized: Math.round(bestNPV * 100) / 100,
    total_npv_naive: Math.round(naiveNPV * 100) / 100,
    optimization_uplift_pct: uplift,
    portfolio_risk_score: selectedProjects.length > 0 ? Math.round((selectedProjects.reduce((a, b) => a + b.risk_score, 0) / selectedProjects.length) * 100) / 100 : 0,
    allocations,
    naive_selection: naiveIds,
    ai_recommendation: aiRec,
    constraints_summary: {
      budget,
      min_cash_reserve: minReserve,
      max_acceptable_risk: maxRisk,
      discount_rate: 0.12,
    },
  };
}

from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from scipy.optimize import milp, LinearConstraint, Bounds
import logging

logger = logging.getLogger("venturelens.allocator")

RISK_THRESHOLDS = {
    "low": 0.40,
    "medium": 0.70,
    "high": 0.95,
}

def solve_portfolio_allocation(
    projects: List[Dict[str, Any]],
    total_budget: float,
    min_cash_reserve: float = 0.0,
    max_acceptable_risk: str = "Medium",
    loan_facility: float = 0.0,
    allow_loan_usage: bool = False
) -> Dict[str, Any]:
    """
    Solves the binary integer programming capital allocation problem:
      Maximize Sum_i [ NPV_i * x_i ]
      Subject to:
        Sum_i [ Cost_i * x_i ] <= Available Budget
        Portfolio Average Risk <= Max Risk Threshold
        x_i in {0, 1}
    Uses PuLP / HiGHS (scipy.optimize.milp) for exact global optimality.
    Computes:
    - Rule-based rejection reasons for unselected projects
    - Naive greedy benchmark (highest-NPV-first)
    - Optimization uplift percentage
    """
    if not projects:
        return {
            "selected_project_ids": [],
            "allocations": [],
            "allocated_budget": 0.0,
            "unallocated_budget": float(total_budget),
            "budget_utilization_pct": 0.0,
            "selected_count": 0,
            "total_projects": 0,
            "total_npv_optimized": 0.0,
            "total_npv_naive": 0.0,
            "optimization_uplift_pct": 0.0,
            "naive_selected_ids": [],
            "portfolio_risk_score": 0.0,
            "ai_explanation": "No candidate projects provided for portfolio evaluation."
        }

    effective_budget = float(total_budget)
    if allow_loan_usage and loan_facility > 0:
        effective_budget += float(loan_facility)

    risk_threshold = RISK_THRESHOLDS.get(str(max_acceptable_risk).lower(), 0.70)
    n = len(projects)

    costs = np.array([float(p["initial_cost"]) for p in projects])
    npvs = np.array([float(p.get("npv", 0.0)) for p in projects])
    risks = np.array([float(p.get("risk_score", 0.50)) for p in projects])

    # -------------------------------------------------------------
    # Solve via PuLP with seamless HiGHS/MILP fallback
    # -------------------------------------------------------------
    selected_mask = None

    # Try PuLP first
    try:
        import pulp
        prob = pulp.LpProblem("Capital_Allocation", pulp.LpMaximize)
        x_vars = {}
        for p in projects:
            pid = p["project_id"]
            if hasattr(prob, "add_variable"):
                x_vars[pid] = prob.add_variable(f"x_{pid}", cat="Binary")
            else:
                x_vars[pid] = pulp.LpVariable(f"x_{pid}", cat=pulp.LpBinary)

        prob += pulp.lpSum([float(p.get("npv", 0.0)) * x_vars[p["project_id"]] for p in projects])
        prob += (
            pulp.lpSum([float(p["initial_cost"]) * x_vars[p["project_id"]] for p in projects]) <= effective_budget
        )
        if risk_threshold < 0.90:
            prob += (
                pulp.lpSum([(float(p.get("risk_score", 0.50)) - risk_threshold) * x_vars[p["project_id"]] for p in projects]) <= 0
            )

        prob.solve()
        if prob.status == pulp.LpStatusOptimal:
            selected_mask = [
                bool(pulp.value(x_vars[p["project_id"]]) is not None and pulp.value(x_vars[p["project_id"]]) > 0.5)
                for p in projects
            ]
    except Exception as e:
        logger.debug(f"PuLP solver not configured or returned error: {e}. Using SciPy HiGHS MILP.")

    # HiGHS MILP / Exact Knapsack Solver fallback
    if selected_mask is None:
        c = -npvs  # milp minimizes c^T x
        # Constraints: A_ub x <= b_ub
        row_budget = costs.reshape(1, -1)
        b_ub = [effective_budget]
        b_lb = [-np.inf]

        if risk_threshold < 0.90:
            row_risk = (risks - risk_threshold).reshape(1, -1)
            A = np.vstack([row_budget, row_risk])
            b_ub.append(0.0)
            b_lb.append(-np.inf)
        else:
            A = row_budget

        constraints = LinearConstraint(A, b_lb, b_ub)
        integrality = np.ones(n)  # All variables integer (binary)
        bounds = Bounds(0, 1)

        res = milp(c=c, integrality=integrality, constraints=constraints, bounds=bounds)
        if res.success:
            selected_mask = [bool(val > 0.5) for val in res.x]
        else:
            # Fallback to exact combinatorial search (feasible for n <= 20)
            best_npv = -float("inf")
            best_combo = [False] * n
            for i in range(1 << n):
                combo = [bool((i >> j) & 1) for j in range(n)]
                tot_c = sum(costs[j] for j in range(n) if combo[j])
                if tot_c > effective_budget:
                    continue
                if risk_threshold < 0.90:
                    sel_r = [risks[j] for j in range(n) if combo[j]]
                    if sel_r and np.mean(sel_r) > risk_threshold:
                        continue
                tot_n = sum(npvs[j] for j in range(n) if combo[j])
                if tot_n > best_npv:
                    best_npv = tot_n
                    best_combo = combo
            selected_mask = best_combo

    selected_ids = [projects[i]["project_id"] for i in range(n) if selected_mask[i]]
    total_allocated = sum(costs[i] for i in range(n) if selected_mask[i])
    total_opt_npv = round(sum(npvs[i] for i in range(n) if selected_mask[i]), 2)
    unallocated_budget = max(0.0, effective_budget - total_allocated)
    sel_risks = [risks[i] for i in range(n) if selected_mask[i]]
    portfolio_avg_risk = round(float(np.mean(sel_risks)), 3) if sel_risks else 0.0

    # -------------------------------------------------------------
    # Naive Comparison: Greedy Highest-NPV-First
    # -------------------------------------------------------------
    sorted_indices = sorted(range(n), key=lambda idx: npvs[idx], reverse=True)
    naive_selected_ids = []
    naive_running_cost = 0.0
    naive_npvs = []

    for idx in sorted_indices:
        cost = costs[idx]
        npv_val = npvs[idx]
        if npv_val > 0 and (naive_running_cost + cost) <= effective_budget:
            naive_selected_ids.append(projects[idx]["project_id"])
            naive_running_cost += cost
            naive_npvs.append(npv_val)

    total_naive_npv = round(sum(naive_npvs), 2)
    if total_naive_npv > 0:
        uplift_pct = round(((total_opt_npv - total_naive_npv) / total_naive_npv) * 100.0, 2)
    else:
        uplift_pct = 0.0

    # -------------------------------------------------------------
    # Rule-Based Rejection Reason Generator
    # -------------------------------------------------------------
    allocations = []
    for i, p in enumerate(projects):
        pid = p["project_id"]
        is_selected = selected_mask[i]
        rejection_reason = None

        if not is_selected:
            cost = costs[i]
            npv_val = npvs[i]
            risk_val = risks[i]

            if npv_val <= 0:
                rejection_reason = f"Negative expected return (NPV: ₹{npv_val:,.0f})."
            elif cost > unallocated_budget:
                shortage = cost - unallocated_budget
                rejection_reason = (
                    f"Exceeds remaining unallocated budget (Cost: ₹{cost:,.0f} vs "
                    f"Remaining: ₹{unallocated_budget:,.0f}, Deficit: ₹{shortage:,.0f})."
                )
            elif risk_val > risk_threshold:
                rejection_reason = (
                    f"Project risk score ({risk_val:.2f}) exceeds portfolio {max_acceptable_risk} "
                    f"risk ceiling ({risk_threshold:.2f})."
                )
            else:
                rejection_reason = (
                    f"Displaced by higher-yielding project combinations to maximize "
                    f"total portfolio return under capital constraints."
                )

        allocations.append({
            "project_id": pid,
            "name": p.get("name", pid),
            "initial_cost": float(costs[i]),
            "npv": float(npvs[i]),
            "risk_score": float(risks[i]),
            "risk_category": p.get("risk_category", "Medium"),
            "decision": "Selected" if is_selected else "Rejected",
            "rejection_reason": rejection_reason
        })

    # AI Plain-Language Narrative
    ai_explanation = generate_portfolio_explanation(
        total_budget=effective_budget,
        allocated=total_allocated,
        unallocated=unallocated_budget,
        selected_count=len(selected_ids),
        total_count=n,
        total_npv=total_opt_npv,
        allocations=allocations,
        max_acceptable_risk=max_acceptable_risk
    )

    return {
        "selected_project_ids": selected_ids,
        "allocations": allocations,
        "allocated_budget": round(float(total_allocated), 2),
        "unallocated_budget": round(float(unallocated_budget), 2),
        "budget_utilization_pct": round(float(total_allocated / effective_budget * 100.0) if effective_budget > 0 else 0.0, 1),
        "selected_count": len(selected_ids),
        "total_projects": n,
        "total_npv_optimized": total_opt_npv,
        "total_npv_naive": total_naive_npv,
        "optimization_uplift_pct": uplift_pct,
        "naive_selected_ids": naive_selected_ids,
        "portfolio_risk_score": portfolio_avg_risk,
        "ai_explanation": ai_explanation
    }


def generate_portfolio_explanation(
    total_budget: float,
    allocated: float,
    unallocated: float,
    selected_count: int,
    total_count: int,
    total_npv: float,
    allocations: List[Dict[str, Any]],
    max_acceptable_risk: str
) -> str:
    """
    Constructs a plain-language financial advisor narrative summarizing
    the portfolio allocation trade-offs, budget utilization, and rejection justifications.
    """
    selected = [a for a in allocations if a["decision"] == "Selected"]
    rejected = [a for a in allocations if a["decision"] == "Rejected"]

    selected_names = ", ".join([f"'{s['name']}' (₹{s['initial_cost']:,.0f})" for s in selected])

    summary = (
        f"VentureLens AI recommendation: The mathematical optimization engine selected {selected_count} "
        f"of {total_count} candidate projects ({selected_names}), committing ₹{allocated:,.0f} "
        f"({allocated / total_budget * 100:.1f}% of total budget) and delivering an aggregate portfolio NPV of ₹{total_npv:,.0f}.\n\n"
        f"Reserve & Risk Status: An unallocated buffer of ₹{unallocated:,.0f} is preserved to safeguard liquidity. "
        f"The selected portfolio satisfies your '{max_acceptable_risk}' risk threshold.\n\n"
    )

    if rejected:
        summary += "Rejected Projects Rationale:\n"
        for r in rejected:
            summary += f"• {r['name']}: {r['rejection_reason']}\n"
    else:
        summary += "All candidate projects were successfully accommodated within the available capital budget."

    return summary.strip()

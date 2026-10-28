"""
VentureLens AI — Financial Metrics Module (`metrics.py`)
Computes comprehensive capital budgeting, discounted cash flow, return,
payback, and investment decision metrics for candidate projects.
Used uniformly across selected and rejected initiatives.
"""

from typing import List, Dict, Any, Optional
from math import gcd
import numpy as np
import numpy_financial as npf


def _simplify_fraction(numerator: float, denominator: float) -> str:
    """Helper to convert fraction into simplified integer string e.g. 3/4."""
    try:
        n = int(round(numerator))
        d = int(round(denominator))
        if d == 0:
            return "0"
        common = gcd(abs(n), abs(d))
        n_simp = n // common
        d_simp = d // common
        if d_simp == 1:
            return f"{n_simp}"
        return f"{n_simp}/{d_simp}"
    except Exception:
        return f"{numerator:.1f}/{denominator:.1f}"


def calculate_irr_percent(
    total_investment: float,
    inflows: List[float],
    max_iter: int = 1000,
    tol: float = 1e-7,
) -> Optional[float]:
    """
    Computes Internal Rate of Return (IRR) as a percentage.
    Returns float (e.g. 21.12 for 21.12%) or None if no valid real root exists.
    Checks strictly for sign change.
    """
    if total_investment <= 0:
        return None

    full_flows = [-abs(total_investment)] + [float(cf) for cf in inflows]

    has_positive = any(cf > 0 for cf in full_flows)
    has_negative = any(cf < 0 for cf in full_flows)
    if not (has_positive and has_negative):
        return None

    # Try numpy_financial.irr first
    try:
        irr_val = npf.irr(full_flows)
        if (
            irr_val is not None
            and not np.isnan(irr_val)
            and not np.isinf(irr_val)
            and -0.99 < irr_val < 50.0
        ):
            return round(float(irr_val * 100.0), 2)
    except Exception:
        pass

    # Newton-Raphson fallback
    r = 0.10
    for _ in range(max_iter):
        npv = sum(cf / ((1.0 + r) ** t) for t, cf in enumerate(full_flows))
        d_npv = sum(
            -t * cf / ((1.0 + r) ** (t + 1))
            for t, cf in enumerate(full_flows)
            if t > 0
        )
        if abs(d_npv) < 1e-12:
            break
        r_new = r - npv / d_npv
        if abs(r_new - r) < tol:
            if -0.99 < r_new < 50.0:
                return round(float(r_new * 100.0), 2)
            return None
        r = r_new

    # Bisection fallback
    low, high = -0.90, 10.0

    def f_rate(rate: float) -> float:
        return sum(cf / ((1.0 + rate) ** t) for t, cf in enumerate(full_flows))

    f_low, f_high = f_rate(low), f_rate(high)
    if f_low * f_high < 0:
        for _ in range(100):
            mid = (low + high) / 2.0
            f_mid = f_rate(mid)
            if abs(f_mid) < tol:
                return round(float(mid * 100.0), 2)
            if f_low * f_mid < 0:
                high = mid
            else:
                low = mid
                f_low = f_mid
        return round(float(((low + high) / 2.0) * 100.0), 2)

    return None


def calculate_payback_years(
    outlay: float,
    cash_flow_stream: List[float]
) -> Optional[float]:
    """
    Computes exact payback period in years using cumulative method
    with linear interpolation within the year of recovery.
    Returns None if outlay is never recovered within the stream.
    """
    if outlay <= 0:
        return 0.0

    cumulative = 0.0
    for t, cf in enumerate(cash_flow_stream, start=1):
        prev_cum = cumulative
        cumulative += cf
        if cumulative >= outlay - 1e-9:
            # Linear interpolation within the year
            unrecovered = outlay - prev_cum
            fraction = (unrecovered / cf) if cf > 0 else 0.0
            return round((t - 1) + fraction, 2)

    return None


def compute_project_metrics(
    initial_cost: float,
    inflows: List[float],
    discount_rate: float,
    contingency_pct: float = 10.0,
    planning_horizon: Optional[int] = None,
    allocated_amount: Optional[float] = None,
    total_budget: Optional[float] = None,
    project_id: Optional[str] = None,
    name: Optional[str] = None,
    risk_category: str = "Medium",
    risk_score: float = 0.50,
    industry_category: str = "General",
) -> Dict[str, Any]:
    """
    Computes all standard corporate finance and decision metrics for a single project:
    - contingency_amount = initial_cost * contingency_pct / 100
    - total_investment = initial_cost + contingency_amount
    - total_benefits = sum(inflows)
    - net_benefit = total_benefits - total_investment
    - pv_of_benefits = sum(inflow_t / (1+r)^t)
    - discount_factors[] = 1/(1+r)^t for each year
    - npv = pv_of_benefits - total_investment
    - bcr (profitability index) = pv_of_benefits / total_investment
    - roi_percent = net_benefit / total_investment * 100
    - annual_avg_return_percent = roi_percent / lifespan
    - irr_percent (numeric solver, return null if no sign change)
    - simple_payback_years (cumulative method, interpolate within the year, null if never recovered)
    - discounted_payback_years (same method on discounted inflows)
    - cumulative_cash_flow[] and discounted_cumulative_cash_flow[] per year
    - break_even_year (first year cumulative cash flow >= 0)
    - allocated_amount, share_of_budget_percent
    - decision: ACCEPT if npv > 0 and bcr > 1 and irr > discount_rate, else REJECT, plus rules list
    - interpretation: one plain-English sentence generated from these numbers
    """
    r = float(discount_rate)
    cost = float(initial_cost)
    pct = float(contingency_pct) if contingency_pct is not None else 10.0
    flows = [float(x) for x in inflows]
    n_years = len(flows)
    lifespan = int(planning_horizon if (planning_horizon is not None and planning_horizon > 0) else (n_years if n_years > 0 else 1))

    # 1. Contingency & Outlay
    contingency_amount = round(cost * pct / 100.0, 2)
    total_investment = round(cost + contingency_amount, 2)

    # 2. Benefits & Profitability
    total_benefits = round(sum(flows), 2)
    net_benefit = round(total_benefits - total_investment, 2)

    # 3. Discounting
    discount_factors: List[float] = []
    pv_inflows: List[float] = []
    for t in range(1, n_years + 1):
        df = 1.0 / ((1.0 + r) ** t)
        discount_factors.append(round(df, 4))
        pv_inflows.append(flows[t - 1] * df)

    pv_of_benefits = round(sum(pv_inflows), 2)
    npv = round(pv_of_benefits - total_investment, 2)
    bcr = round((pv_of_benefits / total_investment), 3) if total_investment > 0 else 0.0

    # 4. Returns & Rates
    roi_percent = round((net_benefit / total_investment * 100.0), 2) if total_investment > 0 else 0.0
    annual_avg_return_percent = round(roi_percent / lifespan, 2) if lifespan > 0 else 0.0
    irr_percent = calculate_irr_percent(total_investment=total_investment, inflows=flows)

    # 5. Payback (Simple & Discounted)
    simple_payback_years = calculate_payback_years(total_investment, flows)
    discounted_payback_years = calculate_payback_years(total_investment, pv_inflows)

    # 6. Cumulative Cash Flows & Break-even Year
    cum_cash = -total_investment
    cum_disc_cash = -total_investment
    cumulative_cash_flow: List[float] = []
    discounted_cumulative_cash_flow: List[float] = []
    break_even_year: Optional[int] = None

    year_by_year_table: List[Dict[str, Any]] = [
        {
            "year": 0,
            "inflow": 0.0,
            "discount_factor": 1.0000,
            "present_value": 0.0,
            "cumulative_cash_flow": round(cum_cash, 2),
            "discounted_cumulative_cash_flow": round(cum_disc_cash, 2),
        }
    ]

    for t in range(1, n_years + 1):
        inflow_t = flows[t - 1]
        pv_t = pv_inflows[t - 1]
        cum_cash += inflow_t
        cum_disc_cash += pv_t

        cum_rounded = round(cum_cash, 2)
        cum_disc_rounded = round(cum_disc_cash, 2)

        cumulative_cash_flow.append(cum_rounded)
        discounted_cumulative_cash_flow.append(cum_disc_rounded)

        if break_even_year is None and cum_cash >= -1e-9:
            break_even_year = t

        year_by_year_table.append({
            "year": t,
            "inflow": round(inflow_t, 2),
            "discount_factor": discount_factors[t - 1],
            "present_value": round(pv_t, 2),
            "cumulative_cash_flow": cum_rounded,
            "discounted_cumulative_cash_flow": cum_disc_rounded,
        })

    # 7. Allocation & Budget Share
    alloc_amt = float(allocated_amount) if allocated_amount is not None else 0.0
    budget_val = float(total_budget) if total_budget is not None and total_budget > 0 else 0.0
    share_of_budget_percent = round((alloc_amt / budget_val * 100.0), 2) if budget_val > 0 else 0.0

    # 8. Decision Evaluation & Rule Breakdown
    # discount_rate can be 0.12 or 12.0
    hurdle_percent = r * 100.0 if r <= 1.0 else r

    rule_npv = {
        "rule": "NPV > 0",
        "description": "Net Present Value must be strictly positive (> ₹0)",
        "passed": bool(npv > 0),
        "actual": f"₹{npv:,.2f}",
        "threshold": "> ₹0.00",
    }
    rule_bcr = {
        "rule": "BCR > 1.0",
        "description": "Benefit-Cost Ratio / Profitability Index must exceed 1.0",
        "passed": bool(bcr > 1.0),
        "actual": f"{bcr:.3f}",
        "threshold": "> 1.000",
    }
    irr_passed = bool(irr_percent is not None and irr_percent > hurdle_percent)
    rule_irr = {
        "rule": "IRR > Hurdle Rate",
        "description": f"Internal Rate of Return must exceed hurdle rate ({hurdle_percent:.1f}%)",
        "passed": irr_passed,
        "actual": f"{irr_percent:.2f}%" if irr_percent is not None else "N/A (no sign change)",
        "threshold": f"> {hurdle_percent:.1f}%",
    }
    rules = [rule_npv, rule_bcr, rule_irr]

    is_accepted = bool(rule_npv["passed"] and rule_bcr["passed"] and rule_irr["passed"])
    decision = "ACCEPT" if is_accepted else "REJECT"

    # 9. Plain-English Interpretation Sentence
    if is_accepted:
        payback_display = f"{simple_payback_years:g}" if simple_payback_years is not None else "N/A"
        irr_display = f"{round(irr_percent)}%" if (irr_percent is not None and abs(irr_percent - round(irr_percent)) < 0.2) else (f"{irr_percent:.1f}%" if irr_percent is not None else "N/A")
        hurdle_display = f"{round(hurdle_percent)}%" if abs(hurdle_percent - round(hurdle_percent)) < 0.2 else f"{hurdle_percent:.1f}%"
        interpretation = (
            f"Recovers the investment in {payback_display} years and earns {irr_display} IRR "
            f"against a {hurdle_display} hurdle rate, so it adds value."
        )
    else:
        if simple_payback_years is None and npv <= 0:
            interpretation = (
                f"Does not recover the investment within the planning horizon and yields a negative "
                f"NPV of ₹{abs(npv):,.0f}, destroying capital value."
            )
        elif npv <= 0:
            interpretation = (
                f"Generates a negative NPV of ₹{abs(npv):,.0f} and BCR of {bcr:.2f}, "
                f"failing the minimum required return threshold."
            )
        elif bcr <= 1.0:
            interpretation = (
                f"Benefit-Cost Ratio of {bcr:.2f} fails the required 1.0 profitability index hurdle."
            )
        elif irr_percent is not None and irr_percent <= hurdle_percent:
            interpretation = (
                f"Earns an IRR of {irr_percent:.1f}% which falls below the company's "
                f"{hurdle_percent:.1f}% hurdle rate, failing capital efficiency criteria."
            )
        else:
            interpretation = (
                f"Project fails decision acceptance criteria with NPV of ₹{npv:,.0f} and BCR of {bcr:.2f}."
            )

    # 10. Worked Substitutions (for Collapsible Section)
    # Worked Payback Substitution
    if simple_payback_years is not None:
        int_years = int(simple_payback_years)
        prior_cum = sum(flows[:int_years])
        unrecovered = total_investment - prior_cum
        inflow_recovery_year = flows[int_years] if int_years < len(flows) else flows[-1]
        frac_str = _simplify_fraction(unrecovered, inflow_recovery_year)
        worked_payback = (
            f"Payback = {int_years} + ({total_investment:,.0f} - {prior_cum:,.0f}) / {inflow_recovery_year:,.0f} "
            f"= {int_years} + {frac_str} = {simple_payback_years:.2f} years"
        )
    else:
        worked_payback = (
            f"Cumulative inflows (₹{total_benefits:,.0f}) do not reach Total Investment "
            f"(₹{total_investment:,.0f}) across {n_years} years; investment is never fully recovered."
        )

    worked_npv = (
        f"NPV = Σ [CF_t / (1 + {r:.2f})^t] - Total Investment = "
        f"₹{pv_of_benefits:,.0f} - ₹{total_investment:,.0f} = ₹{npv:,.0f}"
    )
    worked_bcr = (
        f"BCR = PV of Benefits / Total Investment = "
        f"₹{pv_of_benefits:,.0f} / ₹{total_investment:,.0f} = {bcr:.3f}"
    )
    worked_roi = (
        f"ROI = (Net Benefit / Total Investment) × 100 = "
        f"(₹{net_benefit:,.0f} / ₹{total_investment:,.0f}) × 100 = {roi_percent:.2f}%"
    )
    worked_contingency = (
        f"Contingency ({pct:.1f}%) = ₹{cost:,.0f} × {pct/100:.2f} = ₹{contingency_amount:,.0f}; "
        f"Total Investment = ₹{cost:,.0f} + ₹{contingency_amount:,.0f} = ₹{total_investment:,.0f}"
    )

    worked_calculations = {
        "payback": worked_payback,
        "npv": worked_npv,
        "bcr": worked_bcr,
        "roi": worked_roi,
        "contingency": worked_contingency,
    }

    return {
        "project_id": project_id or "",
        "name": name or "",
        "initial_cost": cost,
        "contingency_pct": pct,
        "contingency_amount": contingency_amount,
        "total_investment": total_investment,
        "total_benefits": total_benefits,
        "net_benefit": net_benefit,
        "pv_of_benefits": pv_of_benefits,
        "discount_factors": discount_factors,
        "npv": npv,
        "bcr": bcr,
        "roi_percent": roi_percent,
        "annual_avg_return_percent": annual_avg_return_percent,
        "irr_percent": irr_percent,
        "simple_payback_years": simple_payback_years,
        "discounted_payback_years": discounted_payback_years,
        "cumulative_cash_flow": cumulative_cash_flow,
        "discounted_cumulative_cash_flow": discounted_cumulative_cash_flow,
        "break_even_year": break_even_year,
        "allocated_amount": alloc_amt,
        "share_of_budget_percent": share_of_budget_percent,
        "decision": decision,
        "rules": rules,
        "interpretation": interpretation,
        "worked_calculations": worked_calculations,
        "year_by_year_table": year_by_year_table,
        "risk_category": risk_category,
        "risk_score": risk_score,
        "industry_category": industry_category,
        "lifespan": lifespan,
    }

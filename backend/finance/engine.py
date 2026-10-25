from typing import List, Optional, Dict, Any
import numpy as np
import numpy_financial as npf

def calculate_npv(
    cash_flows: List[float],
    discount_rate: float,
    initial_cost: Optional[float] = None
) -> float:
    """
    Computes Net Present Value (NPV).
    If initial_cost is provided, cash_flows are treated as future inflows [Year 1, Year 2, ...].
    If initial_cost is None, cash_flows[0] is assumed to be the negative initial investment (Year 0).
    Formula: NPV = Sum_{t=0}^n [ CF_t / (1 + r)^t ]
    """
    if discount_rate <= -1.0:
        raise ValueError("Discount rate must be strictly greater than -100%.")

    if initial_cost is not None:
        full_flows = [-abs(initial_cost)] + list(cash_flows)
    else:
        full_flows = list(cash_flows)

    if not full_flows:
        return 0.0

    npv = 0.0
    for t, cf in enumerate(full_flows):
        npv += cf / ((1.0 + discount_rate) ** t)
    return round(float(npv), 2)


def calculate_irr(
    cash_flows: List[float],
    initial_cost: Optional[float] = None,
    max_iter: int = 1000,
    tol: float = 1e-6
) -> Optional[float]:
    """
    Computes Internal Rate of Return (IRR) where NPV(r) = 0.
    Uses numpy_financial.irr with a robust Newton-Raphson / bisection fallback.
    Returns float (e.g. 0.245 for 24.5%) or None if no real rate of return exists.
    """
    if initial_cost is not None:
        full_flows = [-abs(initial_cost)] + list(cash_flows)
    else:
        full_flows = list(cash_flows)

    # Check for sign change
    has_positive = any(cf > 0 for cf in full_flows)
    has_negative = any(cf < 0 for cf in full_flows)
    if not (has_positive and has_negative):
        return None

    # Try numpy_financial.irr first
    try:
        irr_val = npf.irr(full_flows)
        if irr_val is not None and not np.isnan(irr_val) and not np.isinf(irr_val) and -0.99 < irr_val < 100.0:
            return round(float(irr_val), 4)
    except Exception:
        pass

    # Newton-Raphson fallback
    r = 0.10
    for _ in range(max_iter):
        npv = 0.0
        d_npv = 0.0
        for t, cf in enumerate(full_flows):
            denom = (1.0 + r) ** t
            npv += cf / denom
            if t > 0:
                d_npv -= t * cf / ((1.0 + r) ** (t + 1))
        if abs(d_npv) < 1e-12:
            break
        r_new = r - npv / d_npv
        if abs(r_new - r) < tol:
            if -0.99 < r_new < 50.0:
                return round(float(r_new), 4)
            return None
        r = r_new

    # Bisection fallback
    low, high = -0.90, 10.0
    def npv_at(rate):
        return sum(cf / ((1.0 + rate) ** t) for t, cf in enumerate(full_flows))

    f_low, f_high = npv_at(low), npv_at(high)
    if f_low * f_high < 0:
        for _ in range(100):
            mid = (low + high) / 2.0
            f_mid = npv_at(mid)
            if abs(f_mid) < tol:
                return round(float(mid), 4)
            if f_low * f_mid < 0:
                high = mid
            else:
                low = mid
                f_low = f_mid
        return round(float((low + high) / 2.0), 4)

    return None


def calculate_payback_period(
    cash_flows: List[float],
    initial_cost: Optional[float] = None
) -> Optional[float]:
    """
    Computes exact undiscounted Payback Period using linear interpolation.
    Formula: Payback = (t - 1) + [ (Outlay - Cumulative_{t-1}) / CF_t ]
    """
    if initial_cost is not None:
        outlay = abs(initial_cost)
        inflows = list(cash_flows)
    else:
        outlay = abs(cash_flows[0])
        inflows = list(cash_flows[1:])

    if outlay == 0:
        return 0.0

    cumulative = 0.0
    for t, cf in enumerate(inflows, start=1):
        prev_cum = cumulative
        cumulative += cf
        if cumulative >= outlay:
            # Linear interpolation
            fraction = (outlay - prev_cum) / cf if cf > 0 else 0.0
            return round(float(t - 1 + fraction), 2)

    return None  # Outlay not recovered during planning duration


def calculate_discounted_payback_period(
    cash_flows: List[float],
    discount_rate: float,
    initial_cost: Optional[float] = None
) -> Optional[float]:
    """
    Computes Discounted Payback Period using discounted cash flows.
    """
    if initial_cost is not None:
        outlay = abs(initial_cost)
        inflows = list(cash_flows)
    else:
        outlay = abs(cash_flows[0])
        inflows = list(cash_flows[1:])

    if outlay == 0:
        return 0.0

    cumulative_dcf = 0.0
    for t, cf in enumerate(inflows, start=1):
        dcf = cf / ((1.0 + discount_rate) ** t)
        prev_cum = cumulative_dcf
        cumulative_dcf += dcf
        if cumulative_dcf >= outlay:
            fraction = (outlay - prev_cum) / dcf if dcf > 0 else 0.0
            return round(float(t - 1 + fraction), 2)

    return None


def calculate_profitability_index(
    cash_flows: List[float],
    discount_rate: float,
    initial_cost: Optional[float] = None
) -> float:
    """
    Computes Profitability Index (Benefit-Cost Ratio):
    PI = PV of future cash inflows / Initial Investment
    """
    if initial_cost is not None:
        outlay = abs(initial_cost)
        inflows = list(cash_flows)
    else:
        outlay = abs(cash_flows[0])
        inflows = list(cash_flows[1:])

    if outlay == 0:
        return 0.0

    pv_inflows = sum(cf / ((1.0 + discount_rate) ** t) for t, cf in enumerate(inflows, start=1))
    return round(float(pv_inflows / outlay), 3)


def calculate_break_even_point(
    fixed_costs: float,
    price_per_unit: float,
    variable_cost_per_unit: float
) -> Dict[str, float]:
    """
    Textbook Break-Even Point calculation:
    Contribution Margin = Price - Variable Cost
    Break-Even Units = Fixed Costs / Contribution Margin
    Break-Even Revenue = Break-Even Units * Price
    """
    cm = price_per_unit - variable_cost_per_unit
    if cm <= 0:
        return {
            "contribution_margin": round(cm, 2),
            "break_even_units": None,
            "break_even_revenue": None,
            "cm_ratio": None,
            "viable": False
        }

    be_units = fixed_costs / cm
    be_revenue = be_units * price_per_unit
    cm_ratio = cm / price_per_unit if price_per_unit > 0 else 0.0

    return {
        "contribution_margin": round(float(cm), 2),
        "break_even_units": round(float(be_units), 2),
        "break_even_revenue": round(float(be_revenue), 2),
        "cm_ratio": round(float(cm_ratio), 4),
        "viable": True
    }


def calculate_cash_flow_timeline(
    initial_balance: float,
    cash_flows: List[float],
    min_cash_reserve: float = 0.0,
    initial_cost: Optional[float] = None
) -> List[Dict[str, Any]]:
    """
    Yearly cash flow timeline with running cumulative balance.
    Flags any year where cumulative cash breaches min_cash_reserve.
    """
    timeline = []
    current_balance = float(initial_balance)

    # Year 0: initial investment outlay
    outlay = abs(initial_cost) if initial_cost is not None else (abs(cash_flows[0]) if cash_flows else 0.0)
    current_balance -= outlay
    timeline.append({
        "year": 0,
        "inflow": 0.0,
        "outflow": round(outlay, 2),
        "net_cash_flow": round(-outlay, 2),
        "cumulative_cash": round(current_balance, 2),
        "breaches_reserve": current_balance < min_cash_reserve
    })

    inflows = list(cash_flows) if initial_cost is not None else list(cash_flows[1:])
    for t, cf in enumerate(inflows, start=1):
        inflow_val = max(0.0, cf)
        outflow_val = max(0.0, -cf)
        current_balance += cf
        timeline.append({
            "year": t,
            "inflow": round(inflow_val, 2),
            "outflow": round(outflow_val, 2),
            "net_cash_flow": round(cf, 2),
            "cumulative_cash": round(current_balance, 2),
            "breaches_reserve": current_balance < min_cash_reserve
        })

    return timeline


def calculate_funding_analysis(
    total_cost: float,
    available_budget: float,
    loan_facility: float,
    interest_rate: float = 0.08
) -> Dict[str, Any]:
    """
    Evaluates capital sourcing, borrowing requirement, interest expense, and funding feasibility.
    """
    cost = float(total_cost)
    budget = float(available_budget)
    facility = float(loan_facility)

    internal_equity = min(cost, budget)
    shortfall = max(0.0, cost - internal_equity)
    loan_used = min(shortfall, facility)
    unfunded_gap = max(0.0, shortfall - loan_used)
    annual_interest = loan_used * interest_rate

    return {
        "total_cost": round(cost, 2),
        "internal_equity_allocated": round(internal_equity, 2),
        "loan_required": round(loan_used, 2),
        "unfunded_gap": round(unfunded_gap, 2),
        "annual_interest_expense": round(annual_interest, 2),
        "borrowing_ratio_pct": round((loan_used / cost * 100.0) if cost > 0 else 0.0, 2),
        "fully_funded": unfunded_gap <= 0.001
    }

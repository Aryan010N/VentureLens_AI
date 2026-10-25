import pytest
from backend.finance.engine import (
    calculate_npv,
    calculate_irr,
    calculate_payback_period,
    calculate_discounted_payback_period,
    calculate_profitability_index,
    calculate_break_even_point,
    calculate_cash_flow_timeline,
    calculate_funding_analysis,
)

def test_npv_textbook_worked_example():
    # Worked Example: Outlay $10,000, Inflows: Yr 1 $3,000, Yr 2 $4,000, Yr 3 $5,000 @ 10%
    flows = [3000, 4000, 5000]
    outlay = 10000
    rate = 0.10

    # PV = 3000/1.1 + 4000/1.21 + 5000/1.331 = 2727.27 + 3305.79 + 3756.57 = 9789.63
    # NPV = 9789.63 - 10000 = -210.37
    npv = calculate_npv(flows, discount_rate=rate, initial_cost=outlay)
    assert pytest.approx(npv, abs=0.5) == -210.37

    # Positive NPV example: Outlay $1,000, Inflows: $600, $600 @ 10%
    npv_pos = calculate_npv([600, 600], discount_rate=0.10, initial_cost=1000)
    assert pytest.approx(npv_pos, abs=0.5) == 41.32


def test_irr_textbook_worked_example():
    # Outlay $1,000, Inflows: $600, $600
    # NPV = 0 at r = 13.07%
    irr = calculate_irr([600, 600], initial_cost=1000)
    assert irr is not None
    assert pytest.approx(irr, abs=0.005) == 0.1307


def test_payback_period_linear_interpolation():
    # Outlay $10,000, Inflows: $3,000, $4,000, $5,000
    # Yr 1 cum: 3,000
    # Yr 2 cum: 7,000 (needs 3,000 more out of $5,000 in Yr 3)
    # Payback = 2 + 3000/5000 = 2.6 years
    pb = calculate_payback_period([3000, 4000, 5000], initial_cost=10000)
    assert pb == 2.6

    # Outlay $1,000, Inflows $600, $600 -> 1 + 400/600 = 1.67 years
    pb2 = calculate_payback_period([600, 600], initial_cost=1000)
    assert pb2 == 1.67

    # Never recovered
    pb_never = calculate_payback_period([100, 100], initial_cost=1000)
    assert pb_never is None


def test_discounted_payback_period():
    # Outlay $1,000, Inflows $600, $600 @ 10%
    # DCF Yr 1: 600/1.1 = 545.45
    # DCF Yr 2: 600/1.21 = 495.87
    # Cum Yr 1 = 545.45, needs 454.55 out of 495.87 in Yr 2
    # Fraction = 454.55 / 495.87 = 0.9166 -> 1.92 years
    dpb = calculate_discounted_payback_period([600, 600], discount_rate=0.10, initial_cost=1000)
    assert dpb is not None
    assert pytest.approx(dpb, abs=0.05) == 1.92


def test_profitability_index():
    # Outlay $10,000, PV of inflows = 9789.63 -> PI = 0.979
    pi = calculate_profitability_index([3000, 4000, 5000], discount_rate=0.10, initial_cost=10000)
    assert pytest.approx(pi, abs=0.01) == 0.979

    # Outlay $1,000, PV of inflows = 1041.32 -> PI = 1.041
    pi2 = calculate_profitability_index([600, 600], discount_rate=0.10, initial_cost=1000)
    assert pytest.approx(pi2, abs=0.01) == 1.041


def test_break_even_analysis():
    be = calculate_break_even_point(
        fixed_costs=50000,
        price_per_unit=100,
        variable_cost_per_unit=60
    )
    assert be["contribution_margin"] == 40.0
    assert be["break_even_units"] == 1250.0
    assert be["break_even_revenue"] == 125000.0
    assert be["cm_ratio"] == 0.40
    assert be["viable"] is True


def test_cash_flow_timeline_and_breach_detection():
    # Starting budget $200,000, Reserve $50,000, Outlay $180,000, Inflows: $20,000, $40,000
    timeline = calculate_cash_flow_timeline(
        initial_balance=200000,
        cash_flows=[20000, 40000],
        min_cash_reserve=50000,
        initial_cost=180000
    )
    # Year 0: Balance = 200,000 - 180,000 = 20,000 (< 50,000 -> breach!)
    assert timeline[0]["year"] == 0
    assert timeline[0]["cumulative_cash"] == 20000.0
    assert timeline[0]["breaches_reserve"] is True

    # Year 1: Balance = 20,000 + 20,000 = 40,000 (< 50,000 -> breach!)
    assert timeline[1]["year"] == 1
    assert timeline[1]["cumulative_cash"] == 40000.0
    assert timeline[1]["breaches_reserve"] is True

    # Year 2: Balance = 40,000 + 40,000 = 80,000 (>= 50,000 -> safe!)
    assert timeline[2]["year"] == 2
    assert timeline[2]["cumulative_cash"] == 80000.0
    assert timeline[2]["breaches_reserve"] is False


def test_funding_analysis():
    fa = calculate_funding_analysis(
        total_cost=1000000,
        available_budget=800000,
        loan_facility=300000,
        interest_rate=0.08
    )
    assert fa["internal_equity_allocated"] == 800000.0
    assert fa["loan_required"] == 200000.0
    assert fa["unfunded_gap"] == 0.0
    assert fa["annual_interest_expense"] == 16000.0
    assert fa["borrowing_ratio_pct"] == 20.0
    assert fa["fully_funded"] is True

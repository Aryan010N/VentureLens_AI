import pytest
from backend.finance.metrics import (
    compute_project_metrics,
    calculate_irr_percent,
    calculate_payback_years,
)


def test_hand_checked_case_1_payback_4_years():
    """
    Spec hand-checked case 1:
    Cost 600,000, annual inflow 150,000 for 6 years -> simple payback 4.0 years.
    """
    res = compute_project_metrics(
        initial_cost=600000.0,
        inflows=[150000.0] * 6,
        discount_rate=0.10,
        contingency_pct=0.0,
    )
    assert res["simple_payback_years"] == 4.0
    assert res["break_even_year"] == 4
    assert res["total_investment"] == 600000.0
    assert res["total_benefits"] == 900000.0


def test_hand_checked_case_2_roi_20_percent():
    """
    Spec hand-checked case 2:
    Cost 1,000,000, total profit (net benefit) 200,000 -> ROI 20%.
    """
    # Total benefits = 1,200,000 so net profit = 200,000
    res = compute_project_metrics(
        initial_cost=1000000.0,
        inflows=[1200000.0],
        discount_rate=0.10,
        contingency_pct=0.0,
    )
    assert res["net_benefit"] == 200000.0
    assert res["roi_percent"] == 20.0
    assert res["total_investment"] == 1000000.0


def test_hand_checked_case_3_full_textbook_evaluation():
    """
    Spec hand-checked case 3:
    Cost 10,00,000, 12% rate, inflows 3, 4, 4, 3, 3 lakh (contingency 0) ->
    payback 2.75 years, NPV about +2.32 lakh, BCR about 1.23, ROI 70%, IRR about 21%.
    """
    inflows = [300000.0, 400000.0, 400000.0, 300000.0, 300000.0]
    res = compute_project_metrics(
        initial_cost=1000000.0,
        inflows=inflows,
        discount_rate=0.12,
        contingency_pct=0.0,
    )

    # 1. Simple payback: Year 1: 3L, Year 2: +4L = 7L (unrecovered 3L). Year 3 inflow: 4L -> 2 + 3/4 = 2.75
    assert res["simple_payback_years"] == 2.75
    assert res["break_even_year"] == 3

    # 2. NPV about +2.32 lakh (approx 232,330.27)
    assert 230000.0 <= res["npv"] <= 235000.0
    assert abs(res["npv"] - 232330.27) < 1.0

    # 3. BCR about 1.23 (1.232)
    assert 1.22 <= res["bcr"] <= 1.24
    assert abs(res["bcr"] - 1.232) < 0.01

    # 4. ROI 70% (Total inflows 17L, cost 10L, net 7L -> 70%)
    assert res["roi_percent"] == 70.0

    # 5. IRR about 21% (21.12%)
    assert res["irr_percent"] is not None
    assert 20.5 <= res["irr_percent"] <= 21.5
    assert abs(res["irr_percent"] - 21.12) < 0.1

    # 6. Decision ACCEPT
    assert res["decision"] == "ACCEPT"
    assert all(r["passed"] for r in res["rules"])

    # 7. Interpretation sentence check
    assert "2.75 years" in res["interpretation"]
    assert "21%" in res["interpretation"]
    assert "12%" in res["interpretation"]
    assert "adds value" in res["interpretation"]

    # 8. Worked calculation check
    assert "2 + 3/4 = 2.75 years" in res["worked_calculations"]["payback"]


def test_hand_checked_case_4_unrecovered_cost_rejection():
    """
    Spec hand-checked case 4:
    A project that never recovers cost -> payback null, decision REJECT.
    """
    res = compute_project_metrics(
        initial_cost=1000000.0,
        inflows=[100000.0, 100000.0],  # Total inflows 200,000 < 1,000,000
        discount_rate=0.12,
        contingency_pct=0.0,
    )
    assert res["simple_payback_years"] is None
    assert res["discounted_payback_years"] is None
    assert res["break_even_year"] is None
    assert res["decision"] == "REJECT"
    assert res["npv"] < 0
    assert res["bcr"] < 1.0
    assert "Does not recover the investment" in res["interpretation"]


def test_hand_checked_case_5_contingency_impact():
    """
    Spec hand-checked case 5:
    Contingency 10% increases total_investment and lowers NPV.
    """
    inflows = [300000.0, 400000.0, 400000.0, 300000.0, 300000.0]

    res_0 = compute_project_metrics(
        initial_cost=1000000.0,
        inflows=inflows,
        discount_rate=0.12,
        contingency_pct=0.0,
    )

    res_10 = compute_project_metrics(
        initial_cost=1000000.0,
        inflows=inflows,
        discount_rate=0.12,
        contingency_pct=10.0,
    )

    assert res_0["contingency_amount"] == 0.0
    assert res_0["total_investment"] == 1000000.0

    assert res_10["contingency_amount"] == 100000.0
    assert res_10["total_investment"] == 1100000.0

    # Total investment increased
    assert res_10["total_investment"] > res_0["total_investment"]

    # NPV lowered by exactly 100,000 (contingency amount)
    assert res_10["npv"] < res_0["npv"]
    assert round(res_0["npv"] - res_10["npv"], 2) == 100000.0


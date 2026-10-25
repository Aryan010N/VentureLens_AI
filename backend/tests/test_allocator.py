import pytest
from backend.finance.engine import calculate_npv
from backend.optimization.allocator import solve_portfolio_allocation

def test_spec_scenario_20_lakh_4_projects():
    """
    Verifies the exact CIE-2 specification worked example:
    ₹20 lakh budget, 4 candidate projects.
    Tests that:
    1. 3 of 4 projects are selected (Solar, Recycling, Software).
    2. Total allocated budget is exactly ₹19 lakh (95%).
    3. Unallocated budget is ₹1 lakh.
    4. Energy-efficient equipment is excluded, with a dynamic rejection reason.
    """
    discount_rate = 0.12

    # Calculate deterministic textbook NPVs
    solar_npv = calculate_npv([300000] * 5, discount_rate=discount_rate, initial_cost=800000)
    recycling_npv = calculate_npv([250000] * 5, discount_rate=discount_rate, initial_cost=600000)
    software_npv = calculate_npv([240000] * 5, discount_rate=discount_rate, initial_cost=500000)
    energy_npv = calculate_npv([180000] * 5, discount_rate=discount_rate, initial_cost=400000)

    projects = [
        {
            "project_id": "proj_solar",
            "name": "Solar installation",
            "initial_cost": 800000,
            "npv": solar_npv,
            "risk_score": 0.50,
            "risk_category": "Medium"
        },
        {
            "project_id": "proj_recycling",
            "name": "Recycling unit",
            "initial_cost": 600000,
            "npv": recycling_npv,
            "risk_score": 0.50,
            "risk_category": "Medium"
        },
        {
            "project_id": "proj_software",
            "name": "Software product",
            "initial_cost": 500000,
            "npv": software_npv,
            "risk_score": 0.70,
            "risk_category": "High"
        },
        {
            "project_id": "proj_energy",
            "name": "Energy-efficient equipment",
            "initial_cost": 400000,
            "npv": energy_npv,
            "risk_score": 0.30,
            "risk_category": "Low"
        },
    ]

    result = solve_portfolio_allocation(
        projects=projects,
        total_budget=2000000,
        min_cash_reserve=200000,
        max_acceptable_risk="Medium"
    )

    # 1. Check selected count
    assert result["selected_count"] == 3
    assert result["total_projects"] == 4
    assert set(result["selected_project_ids"]) == {"proj_solar", "proj_recycling", "proj_software"}

    # 2. Check allocation values
    assert result["allocated_budget"] == 1900000.0
    assert result["unallocated_budget"] == 100000.0
    assert result["budget_utilization_pct"] == 95.0

    # 3. Check excluded project and rejection reason
    energy_allocation = next(a for a in result["allocations"] if a["project_id"] == "proj_energy")
    assert energy_allocation["decision"] == "Rejected"
    assert energy_allocation["rejection_reason"] is not None
    assert "Exceeds remaining unallocated budget" in energy_allocation["rejection_reason"]

    # 4. Total NPV must match sum of selected projects
    expected_npv = round(solar_npv + recycling_npv + software_npv, 2)
    assert result["total_npv_optimized"] == expected_npv


def test_hand_verifiable_knapsack_outperforms_greedy_naive():
    """
    Scenario 2: Classic Knapsack trade-off where greedy naive fails:
    Budget: $100,000
    - Heavy Project: Cost $70,000, NPV $60,000 (highest single NPV)
    - Light A: Cost $50,000, NPV $45,000
    - Light B: Cost $50,000, NPV $45,000
    Naive selects Heavy -> Total NPV $60,000 (remaining budget $30,000 cannot fund either Light A or B).
    PuLP selects Light A + Light B -> Total NPV $90,000 (Uplift: +50%).
    """
    projects = [
        {"project_id": "heavy", "name": "Heavy", "initial_cost": 70000, "npv": 60000, "risk_score": 0.4},
        {"project_id": "light_a", "name": "Light A", "initial_cost": 50000, "npv": 45000, "risk_score": 0.3},
        {"project_id": "light_b", "name": "Light B", "initial_cost": 50000, "npv": 45000, "risk_score": 0.3},
    ]

    result = solve_portfolio_allocation(
        projects=projects,
        total_budget=100000,
        max_acceptable_risk="High"
    )

    assert set(result["selected_project_ids"]) == {"light_a", "light_b"}
    assert result["total_npv_optimized"] == 90000.0
    assert result["total_npv_naive"] == 60000.0
    assert result["optimization_uplift_pct"] == 50.0

    # Heavy should be rejected because combined light_a + light_b yields higher NPV
    heavy_item = next(a for a in result["allocations"] if a["project_id"] == "heavy")
    assert heavy_item["decision"] == "Rejected"

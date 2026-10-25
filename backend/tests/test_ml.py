import pytest
from backend.ml.predict import (
    predict_project_risk_and_confidence,
    generate_deterministic_scenarios,
    get_ml_metrics,
)

def test_ml_predictions():
    # Low risk software project
    risk_low, conf_low = predict_project_risk_and_confidence(
        industry_category="Software",
        risk_category="Low",
        duration_years=5,
        initial_cost=500000,
        funding_rounds=3,
        milestones=4,
        relationships=10
    )
    assert 0.0 <= risk_low <= 1.0
    assert 0.45 <= conf_low <= 1.0

    # High risk biotech project
    risk_high, conf_high = predict_project_risk_and_confidence(
        industry_category="Biotech",
        risk_category="High",
        duration_years=5,
        initial_cost=1000000,
        funding_rounds=1,
        milestones=0,
        relationships=1
    )
    assert 0.0 <= risk_high <= 1.0
    assert 0.45 <= conf_high <= 1.0
    # High risk should have higher risk score than low risk
    assert risk_high >= risk_low

def test_deterministic_scenarios():
    base_cf = [100000, 100000, 100000]
    conf = 0.80
    scenarios = generate_deterministic_scenarios(base_cf, conf)
    assert "expected" in scenarios
    assert "optimistic" in scenarios
    assert "pessimistic" in scenarios

    assert scenarios["expected"] == [80000.0, 80000.0, 80000.0]
    assert scenarios["optimistic"] == [120000.0, 120000.0, 120000.0]
    assert scenarios["pessimistic"] == [75000.0, 75000.0, 75000.0]

def test_metrics_retrieval():
    metrics = get_ml_metrics()
    assert "dataset_slug" in metrics
    assert metrics["dataset_slug"] == "manishkc06/startup-success-prediction"

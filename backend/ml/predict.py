import os
import json
import logging
from typing import Dict, Any, List, Tuple
import joblib
import numpy as np

logger = logging.getLogger("venturelens.ml.predict")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
REVENUE_MODEL_PATH = os.path.join(MODELS_DIR, "revenue_model.pkl")
RISK_MODEL_PATH = os.path.join(MODELS_DIR, "risk_model.pkl")
METRICS_PATH = os.path.join(MODELS_DIR, "metrics.json")

_revenue_model = None
_risk_model = None
_metrics = None

FEATURE_COLS = [
    "funding_rounds",
    "milestones",
    "relationships",
    "age_last_funding_year",
    "avg_participants",
    "is_software",
    "is_enterprise",
    "is_biotech",
    "is_ecommerce",
]

def load_ml_models():
    global _revenue_model, _risk_model, _metrics
    if _revenue_model is None and os.path.exists(REVENUE_MODEL_PATH):
        try:
            _revenue_model = joblib.load(REVENUE_MODEL_PATH)
            logger.info("Loaded revenue confidence model.")
        except Exception as e:
            logger.error(f"Failed to load revenue model: {e}")

    if _risk_model is None and os.path.exists(RISK_MODEL_PATH):
        try:
            _risk_model = joblib.load(RISK_MODEL_PATH)
            logger.info("Loaded risk classifier model.")
        except Exception as e:
            logger.error(f"Failed to load risk model: {e}")

    if _metrics is None and os.path.exists(METRICS_PATH):
        try:
            with open(METRICS_PATH, "r") as f:
                _metrics = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load metrics: {e}")

    return _revenue_model, _risk_model, _metrics


def build_feature_vector(
    industry_category: str,
    risk_category: str,
    duration_years: int,
    initial_cost: float,
    funding_rounds: int = None,
    relationships: int = None,
    milestones: int = None,
    age_years: float = None,
) -> np.ndarray:
    """
    Transforms project input into feature vector aligned with historical startup dataset schema.
    If historical milestones/rounds are not provided, uses intelligent domain priors:
    - Low risk: higher historical maturity priors
    - Medium risk: median baseline priors
    - High risk: early-stage priors
    """
    ind = industry_category.lower()
    is_software = 1.0 if any(k in ind for k in ["software", "tech", "app", "saas", "digital"]) else 0.0
    is_enterprise = 1.0 if any(k in ind for k in ["enterprise", "b2b", "corp", "business", "service"]) else 0.0
    is_biotech = 1.0 if any(k in ind for k in ["bio", "health", "pharma", "med"]) else 0.0
    is_ecommerce = 1.0 if any(k in ind for k in ["ecom", "retail", "market", "consumer"]) else 0.0

    # Risk level prior tuning for operational maturity
    risk_norm = str(risk_category).lower()
    if funding_rounds is None:
        funding_rounds = 3 if risk_norm == "low" else (2 if risk_norm == "medium" else 1)
    if milestones is None:
        milestones = 3 if risk_norm == "low" else (2 if risk_norm == "medium" else 1)
    if relationships is None:
        relationships = 8 if risk_norm == "low" else (4 if risk_norm == "medium" else 2)
    if age_years is None:
        age_years = float(max(1, duration_years - 1))

    avg_participants = 2.5 if risk_norm == "low" else (1.8 if risk_norm == "medium" else 1.2)

    features = [
        float(funding_rounds),
        float(milestones),
        float(relationships),
        float(age_years),
        float(avg_participants),
        is_software,
        is_enterprise,
        is_biotech,
        is_ecommerce,
    ]
    import pandas as pd
    return pd.DataFrame([features], columns=FEATURE_COLS)


def predict_project_risk_and_confidence(
    industry_category: str,
    risk_category: str,
    duration_years: int,
    initial_cost: float,
    funding_rounds: int = None,
    relationships: int = None,
    milestones: int = None,
    age_years: float = None,
) -> Tuple[float, float]:
    """
    Runs ML inference on real historical models:
    Returns (risk_score, confidence_multiplier)
    - risk_score: 1.0 - success_probability (bounded in [0.05, 0.95])
    - confidence_multiplier: estimated cash flow realization factor (bounded in [0.45, 1.0])
    """
    reg_model, cls_model, _ = load_ml_models()
    x = build_feature_vector(
        industry_category=industry_category,
        risk_category=risk_category,
        duration_years=duration_years,
        initial_cost=initial_cost,
        funding_rounds=funding_rounds,
        relationships=relationships,
        milestones=milestones,
        age_years=age_years,
    )

    # 1. Revenue Confidence Multiplier
    if reg_model is not None:
        conf_pred = float(reg_model.predict(x)[0])
        confidence_multiplier = round(float(np.clip(conf_pred, 0.45, 0.98)), 3)
    else:
        # Fallback prior
        base = 0.90 if risk_category.lower() == "low" else (0.80 if risk_category.lower() == "medium" else 0.65)
        confidence_multiplier = base

    # 2. Risk Score from Classifier
    if cls_model is not None:
        prob_success = float(cls_model.predict_proba(x)[0, 1])
        # risk_score = 1 - success probability
        risk_score = round(float(np.clip(1.0 - prob_success, 0.05, 0.95)), 3)
    else:
        base_risk = 0.25 if risk_category.lower() == "low" else (0.50 if risk_category.lower() == "medium" else 0.85)
        risk_score = base_risk

    return risk_score, confidence_multiplier


def generate_deterministic_scenarios(
    base_cash_flows: List[float],
    confidence_multiplier: float
) -> Dict[str, List[float]]:
    """
    Deterministic rule-based Scenario Generator (assumption-based, NOT ML):
    - Expected Scenario: Base cash flows adjusted by the ML operational confidence multiplier
    - Optimistic Scenario: +20% revenue upside
    - Pessimistic Scenario: -25% market/cost contraction downside
    """
    expected = [round(float(cf) * confidence_multiplier, 2) for cf in base_cash_flows]
    optimistic = [round(float(cf) * 1.20, 2) for cf in base_cash_flows]
    pessimistic = [round(float(cf) * 0.75, 2) for cf in base_cash_flows]

    return {
        "expected": expected,
        "optimistic": optimistic,
        "pessimistic": pessimistic,
    }


def get_ml_metrics() -> Dict[str, Any]:
    """Returns stored ML model performance metrics."""
    _, _, metrics = load_ml_models()
    if metrics:
        return metrics
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "r") as f:
            return json.load(f)
    return {
        "message": "Models not yet trained",
        "dataset_slug": "manishkc06/startup-success-prediction"
    }

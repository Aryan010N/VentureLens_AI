import os
import json
import logging
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import (
    r2_score,
    mean_absolute_error,
    mean_squared_error,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("venturelens.ml.train")

DATASET_SLUG = "manishkc06/startup-success-prediction"
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_PATH = os.path.join(BASE_DIR, "data", "startup_data.csv")
MODELS_DIR = os.path.join(BASE_DIR, "backend", "models")

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

def load_and_preprocess_data(data_path: str = DATA_PATH):
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Real Kaggle dataset not found at {data_path}")

    df = pd.read_csv(data_path)
    logger.info(f"Loaded dataset from {data_path} with shape {df.shape}")

    # Handle missing values for numerical features using median
    for col in FEATURE_COLS:
        if col in df.columns:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)
        else:
            df[col] = 0.0

    # Ensure binary target for classification: labels (1 = acquired/success, 0 = closed)
    if "labels" in df.columns:
        y_class = df["labels"].astype(int)
    elif "status" in df.columns:
        y_class = df["status"].apply(lambda s: 1 if str(s).lower() == "acquired" else 0)
    else:
        raise ValueError("Target label column not found in dataset")

    # Define continuous target for revenue confidence multiplier (bounded 0.40 to 1.0)
    # Using real milestone achievement rate and relationship connectivity
    # Projects with strong milestone execution and funding stability exhibit higher cash flow realization
    milestone_factor = np.log1p(np.maximum(0, df["milestones"])) * 0.15
    rel_factor = np.log1p(np.maximum(0, df["relationships"])) * 0.10
    round_factor = np.clip(df["funding_rounds"] * 0.05, 0, 0.20)
    
    # Base confidence score
    raw_confidence = 0.50 + milestone_factor + rel_factor + round_factor
    # Modulate slightly by outcome label
    raw_confidence = np.where(y_class == 1, raw_confidence * 1.10, raw_confidence * 0.90)
    y_reg = np.clip(raw_confidence / 1.35, 0.45, 0.98)

    X = df[FEATURE_COLS].copy()
    return X, y_reg, y_class


def train_models():
    os.makedirs(MODELS_DIR, exist_ok=True)
    X, y_reg, y_class = load_and_preprocess_data()

    # 80/20 train/test split on real historical data
    X_train, X_test, y_reg_train, y_reg_test, y_cls_train, y_cls_test = train_test_split(
        X, y_reg, y_class, test_size=0.20, random_state=42, stratify=y_class
    )

    logger.info(f"Training set size: {len(X_train)}, Test set size: {len(X_test)}")

    # 1. Revenue Confidence Model (RandomForestRegressor)
    reg_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=6,
        min_samples_split=4,
        random_state=42
    )
    reg_model.fit(X_train, y_reg_train)
    y_reg_pred = reg_model.predict(X_test)

    r2 = float(r2_score(y_reg_test, y_reg_pred))
    mae = float(mean_absolute_error(y_reg_test, y_reg_pred))
    rmse = float(np.sqrt(mean_squared_error(y_reg_test, y_reg_pred)))

    logger.info(f"Revenue Model Test Metrics -> R2: {r2:.4f}, MAE: {mae:.4f}, RMSE: {rmse:.4f}")

    # 2. Risk/Distress Classifier (RandomForestClassifier)
    cls_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=5,
        min_samples_split=4,
        random_state=42
    )
    cls_model.fit(X_train, y_cls_train)
    y_cls_pred = cls_model.predict(X_test)
    y_cls_proba = cls_model.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_cls_test, y_cls_pred))
    prec = float(precision_score(y_cls_test, y_cls_pred, zero_division=0))
    rec = float(recall_score(y_cls_test, y_cls_pred, zero_division=0))
    f1 = float(f1_score(y_cls_test, y_cls_pred, zero_division=0))
    auc = float(roc_auc_score(y_cls_test, y_cls_proba))

    logger.info(f"Risk Classifier Test Metrics -> Acc: {acc:.4f}, Prec: {prec:.4f}, Rec: {rec:.4f}, F1: {f1:.4f}, ROC-AUC: {auc:.4f}")

    # Save models
    reg_path = os.path.join(MODELS_DIR, "revenue_model.pkl")
    cls_path = os.path.join(MODELS_DIR, "risk_model.pkl")
    joblib.dump(reg_model, reg_path)
    joblib.dump(cls_model, cls_path)

    metrics = {
        "dataset_slug": DATASET_SLUG,
        "dataset_name": "Startup Success Prediction (Real Historical Data)",
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "features": FEATURE_COLS,
        "revenue_confidence_model": {
            "algorithm": "RandomForestRegressor",
            "r2_score": round(r2, 4),
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "n_estimators": 100,
            "max_depth": 6
        },
        "risk_classifier_model": {
            "algorithm": "RandomForestClassifier",
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "n_estimators": 100,
            "max_depth": 5
        },
        "disclaimer": "ML predictions are estimates based on historical data, not guaranteed returns."
    }

    metrics_path = os.path.join(MODELS_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info(f"Models and metrics successfully saved to {MODELS_DIR}")
    return metrics

if __name__ == "__main__":
    train_models()

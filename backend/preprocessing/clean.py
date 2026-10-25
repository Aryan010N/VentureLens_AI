import io
import json
import re
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
from pydantic import ValidationError
from backend.schemas.project import ProjectCreate, RiskCategory

# Risk mapping for quantitative risk weight calculation
RISK_MAPPING = {
    "low": 0.25,
    "medium": 0.50,
    "high": 0.85,
}

INDUSTRY_CATEGORIES = [
    "software",
    "cleantech",
    "energy",
    "biotech",
    "ecommerce",
    "manufacturing",
    "services",
    "healthcare",
    "general"
]

def parse_cash_flows(raw_val: Any) -> List[float]:
    """
    Parses various cash flow representations into a list of floats:
    - List of floats/ints
    - JSON array string: "[300000, 350000, 400000]"
    - Semicolon/pipe separated string: "100,000; 200,000; 300,000"
    - Comma-separated list: "300000, 350000, 400000" or "[300000, 300000]"
    """
    if isinstance(raw_val, (list, tuple)):
        return [float(x) for x in raw_val if x is not None]

    if pd.isna(raw_val):
        return []

    val_str = str(raw_val).strip()
    # Try parsing as JSON first
    if val_str.startswith("[") and val_str.endswith("]"):
        try:
            parsed = json.loads(val_str)
            return [float(x) for x in parsed]
        except Exception:
            pass

    # Strip currency symbols
    cleaned = val_str.replace("₹", "").replace("$", "").strip()

    # If semicolon or pipe is present, use that as delimiter, allowing commas as thousand separators
    if ";" in cleaned or "|" in cleaned:
        tokens = re.split(r"[;|]+", cleaned)
        flows = []
        for token in tokens:
            t = token.replace(",", "").strip()
            if t:
                try:
                    flows.append(float(t))
                except ValueError:
                    continue
        return flows

    # If bracket-free with commas, check if commas are list separators or thousand separators
    # E.g. "300000, 300000" or "300,000"
    # If standard numbers separated by comma:
    parts = cleaned.split(",")
    # If all parts when stripped are numeric numbers:
    # E.g. ["100000", "200000"] -> 2 items.
    # But if someone wrote "100,000", parts is ["100", "000"] -> if only 3 digits in second part and only 2 parts, might be single number.
    # However, in financial tables, lists of cash flows are usually written either without thousand separators (300000, 250000) or inside brackets [300000, 250000].
    flows = []
    for p in parts:
        p_clean = p.strip()
        if p_clean:
            try:
                flows.append(float(p_clean))
            except ValueError:
                continue
    return flows



def clean_and_validate_project_row(
    row_data: Dict[str, Any],
    row_index: int
) -> Tuple[Optional[ProjectCreate], Optional[str]]:
    """
    Validates and cleans an individual project row.
    Returns (ProjectCreate, None) if valid, or (None, error_msg) if invalid.
    """
    # Normalize keys to lower snake_case
    normalized = {}
    for k, v in row_data.items():
        clean_k = str(k).strip().lower().replace(" ", "_").replace("-", "_")
        normalized[clean_k] = v

    name = normalized.get("name") or normalized.get("project_name") or normalized.get("title")
    if not name or pd.isna(name) or str(name).strip() == "":
        return None, f"Row {row_index}: Missing required 'name' field."

    name = str(name).strip()

    # Initial cost
    raw_cost = normalized.get("initial_cost") or normalized.get("cost") or normalized.get("investment")
    if raw_cost is None or pd.isna(raw_cost):
        return None, f"Row {row_index} ('{name}'): Missing 'initial_cost'."
    try:
        cost_val = float(str(raw_cost).replace(",", "").replace("₹", "").replace("$", "").strip())
        if cost_val <= 0:
            return None, f"Row {row_index} ('{name}'): 'initial_cost' must be greater than 0 (got {cost_val})."
    except ValueError:
        return None, f"Row {row_index} ('{name}'): Non-numeric 'initial_cost' ({raw_cost})."

    # Duration
    raw_duration = normalized.get("duration_years") or normalized.get("duration") or normalized.get("years")
    duration = None
    if raw_duration is not None and not pd.isna(raw_duration):
        try:
            duration = int(float(raw_duration))
            if duration <= 0:
                return None, f"Row {row_index} ('{name}'): 'duration_years' must be positive."
        except ValueError:
            return None, f"Row {row_index} ('{name}'): Non-integer 'duration_years'."

    # Cash flows: check both 'cash_flows' column and individual 'cash_flow_1', 'cash_flow_2'...
    raw_cf = normalized.get("cash_flows") or normalized.get("cash_flow") or normalized.get("cashflows")
    cash_flows: List[float] = []

    if raw_cf is not None and not pd.isna(raw_cf):
        cash_flows = parse_cash_flows(raw_cf)
    else:
        # Check for wide format columns like year_1, year_2 or cf_1, cf_2
        cf_cols = []
        for k in sorted(normalized.keys()):
            if re.match(r"^(cash_flow_|cf_|year_|y_)\d+$", k):
                cf_cols.append(k)
        if cf_cols:
            for c in cf_cols:
                try:
                    val = float(normalized[c])
                    cash_flows.append(val)
                except (ValueError, TypeError):
                    cash_flows.append(0.0)

    if not cash_flows:
        return None, f"Row {row_index} ('{name}'): Cash flow array is empty or unparseable."

    if duration is None:
        duration = len(cash_flows)
    elif len(cash_flows) != duration:
        # Reconcile length to match duration
        if len(cash_flows) < duration:
            last_cf = cash_flows[-1] if cash_flows else cost_val * 0.25
            cash_flows.extend([last_cf] * (duration - len(cash_flows)))
        else:
            cash_flows = cash_flows[:duration]

    # Risk category
    raw_risk = str(normalized.get("risk_category") or normalized.get("risk") or "Medium").strip().capitalize()
    if raw_risk not in ["Low", "Medium", "High"]:
        raw_risk = "Medium"

    # Industry category
    raw_industry = str(normalized.get("industry_category") or normalized.get("industry") or "Software").strip()
    if not raw_industry:
        raw_industry = "General"

    try:
        project = ProjectCreate(
            name=name,
            initial_cost=cost_val,
            cash_flows=cash_flows,
            risk_category=RiskCategory(raw_risk),
            industry_category=raw_industry,
            duration_years=duration
        )
        return project, None
    except ValidationError as ve:
        return None, f"Row {row_index} ('{name}'): Validation error: {ve}"


def parse_and_clean_file(
    file_bytes: bytes,
    filename: str
) -> Tuple[List[ProjectCreate], List[str]]:
    """
    Parses a CSV or Excel file buffer, performs full data cleaning,
    missing-value imputation, format reconciliation, and returns:
    (valid_projects, error_messages)
    """
    errors: List[str] = []
    projects: List[ProjectCreate] = []

    filename_lower = filename.lower()
    try:
        if filename_lower.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_bytes))
        elif filename_lower.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            return [], [f"Unsupported file format '{filename}'. Please upload a .csv or .xlsx file."]
    except Exception as e:
        return [], [f"Could not parse file '{filename}': {str(e)}"]

    if df.empty:
        return [], ["Uploaded file is empty."]

    # Iterate through rows
    for idx, row in df.iterrows():
        row_dict = row.to_dict()
        proj, err = clean_and_validate_project_row(row_dict, idx + 1)
        if err:
            errors.append(err)
        elif proj:
            projects.append(proj)

    return projects, errors


def encode_features_for_ml(
    risk_category: str,
    industry_category: str,
    cost: float,
    duration: int
) -> Dict[str, float]:
    """
    Encodes project characteristics into numerical features expected by the ML models.
    """
    risk_lower = risk_category.lower()
    risk_weight = RISK_MAPPING.get(risk_lower, 0.50)

    industry_clean = industry_category.lower()
    is_software = 1.0 if "software" in industry_clean or "tech" in industry_clean or "app" in industry_clean else 0.0
    is_cleantech = 1.0 if "clean" in industry_clean or "solar" in industry_clean or "energy" in industry_clean else 0.0
    is_bio = 1.0 if "bio" in industry_clean or "health" in industry_clean or "med" in industry_clean else 0.0
    is_ecommerce = 1.0 if "ecom" in industry_clean or "retail" in industry_clean else 0.0

    return {
        "cost": float(cost),
        "duration": float(duration),
        "risk_weight": risk_weight,
        "is_software": is_software,
        "is_cleantech": is_cleantech,
        "is_biotech": is_bio,
        "is_ecommerce": is_ecommerce,
    }

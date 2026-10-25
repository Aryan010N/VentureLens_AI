import io
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.preprocessing.clean import (
    parse_cash_flows,
    clean_and_validate_project_row,
    parse_and_clean_file,
    encode_features_for_ml,
)

client = TestClient(app)

def test_parse_cash_flows():
    assert parse_cash_flows("[100, 200, 300]") == [100.0, 200.0, 300.0]
    assert parse_cash_flows("100, 200, 300") == [100.0, 200.0, 300.0]
    assert parse_cash_flows("₹100,000; 200,000; 300,000") == [100000.0, 200000.0, 300000.0]
    assert parse_cash_flows([50, 60.5]) == [50.0, 60.5]

def test_clean_and_validate_project_row():
    valid_row = {
        "name": "Project Alpha",
        "initial_cost": "500000",
        "cash_flows": "[150000, 200000, 250000]",
        "risk_category": "Medium",
        "industry_category": "Software",
        "duration_years": 3
    }
    proj, err = clean_and_validate_project_row(valid_row, 1)
    assert err is None
    assert proj is not None
    assert proj.name == "Project Alpha"
    assert proj.initial_cost == 500000.0
    assert len(proj.cash_flows) == 3

    # Invalid cost
    bad_row = {"name": "Bad Cost", "initial_cost": "-100", "cash_flows": "[100]"}
    proj_bad, err_bad = clean_and_validate_project_row(bad_row, 2)
    assert proj_bad is None
    assert "greater than 0" in err_bad

def test_upload_projects_endpoint():
    csv_bytes = b"name,initial_cost,cash_flows,risk_category,industry_category,duration_years\nSolar,800000,\"300000, 300000, 300000\",Medium,CleanTech,3\nWind,500000,\"200000, 200000, 200000\",Low,CleanTech,3\n"
    response = client.post(
        "/api/upload-projects",
        data={"company_id": "test_upload_comp"},
        files={"file": ("test.csv", io.BytesIO(csv_bytes), "text/csv")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["uploaded_count"] == 2
    assert len(data["projects"]) == 2

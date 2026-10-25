import io
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_full_api_workflow():
    company_id = f"test_e2e_{uuid.uuid4().hex[:8]}"

    # 1. Health check
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    # 2. Metadata
    res_meta = client.get("/api/metadata")
    assert res_meta.status_code == 200
    meta_json = res_meta.json()
    assert "dataset_slug" in meta_json
    assert meta_json["dataset_slug"] == "manishkc06/startup-success-prediction"

    # 3. Create Company
    company_payload = {
        "company_id": company_id,
        "total_investment_budget": 2000000.0,
        "min_cash_reserve": 200000.0,
        "loan_facility": 500000.0,
        "discount_rate": 0.12,
        "planning_period_years": 5,
        "max_acceptable_risk": "Medium"
    }
    res_comp = client.post("/api/company", json=company_payload)
    assert res_comp.status_code == 201
    comp_data = res_comp.json()
    assert comp_data["company_id"] == company_id
    assert comp_data["total_investment_budget"] == 2000000.0

    # 4. Upload Projects CSV matching the 4-project spec scenario
    csv_content = (
        "name,initial_cost,cash_flows,risk_category,industry_category,duration_years\n"
        "Solar installation,800000,\"[300000, 300000, 300000, 300000, 300000]\",Medium,CleanTech,5\n"
        "Recycling unit,600000,\"[250000, 250000, 250000, 250000, 250000]\",Medium,Environmental,5\n"
        "Software product,500000,\"[240000, 240000, 240000, 240000, 240000]\",High,Software,5\n"
        "Energy-efficient equipment,400000,\"[180000, 180000, 180000, 180000, 180000]\",Low,Energy,5\n"
    ).encode("utf-8")

    res_upload = client.post(
        "/api/upload-projects",
        data={"company_id": company_id},
        files={"file": ("projects.csv", io.BytesIO(csv_content), "text/csv")}
    )
    assert res_upload.status_code == 200
    upload_data = res_upload.json()
    assert upload_data["uploaded_count"] == 4

    # 5. Run Analyze endpoint
    res_analyze = client.post("/api/analyze", json={"company_id": company_id})
    assert res_analyze.status_code == 200
    analyze_data = res_analyze.json()
    assert len(analyze_data["projects"]) == 4

    for p in analyze_data["projects"]:
        assert "npv" in p
        assert "irr" in p
        assert "payback_period" in p
        assert "risk_score" in p
        assert "confidence_multiplier" in p
        assert "scenarios" in p
        assert "cash_flow_timeline" in p
        assert "funding_analysis" in p

    # 6. Run Optimize endpoint
    res_opt = client.post("/api/optimize", json={"company_id": company_id})
    assert res_opt.status_code == 200
    opt_data = res_opt.json()
    assert opt_data["selected_count"] == 3
    assert opt_data["allocated_budget"] == 1900000.0
    assert opt_data["unallocated_budget"] == 100000.0
    assert opt_data["total_npv_optimized"] > 0
    assert "ai_recommendation" in opt_data

    # Check unselected project rejection reason
    energy_proj = next(a for a in opt_data["allocations"] if "Energy" in a["name"])
    assert energy_proj["decision"] == "Rejected"
    assert energy_proj["rejection_reason"] is not None

    # 7. Check History endpoint
    res_runs = client.get(f"/api/runs/{company_id}")
    assert res_runs.status_code == 200
    runs = res_runs.json()
    assert len(runs) >= 1
    assert runs[0]["run_id"] == opt_data["run_id"]

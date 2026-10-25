import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form

from backend.schemas.company import CompanyCreate, CompanyResponse
from backend.schemas.project import ProjectCreate, ProjectResponse
from backend.schemas.analysis import (
    AnalysisRequest,
    OptimizationRequest,
    OptimizationResponse,
    ProjectFinancials,
    CashFlowTimelinePoint,
    AllocationItem,
)
from backend.database.firestore import (
    save_company,
    get_company,
    save_project,
    get_projects,
    save_run,
    get_runs,
)
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
from backend.ml.predict import (
    predict_project_risk_and_confidence,
    generate_deterministic_scenarios,
    get_ml_metrics,
)
from backend.optimization.allocator import solve_portfolio_allocation
from backend.preprocessing.clean import parse_and_clean_file

router = APIRouter(prefix="/api", tags=["VentureLens Core"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "VentureLens AI - Multi-Project Capital Allocation Advisor",
        "version": "1.0.0",
        "database": "Firebase Firestore",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/metadata")
def get_metadata():
    """
    Returns real ML model performance metrics, dataset citation, and architecture parameters.
    """
    return get_ml_metrics()

@router.post("/company", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_company(payload: CompanyCreate):
    """
    Creates or updates company financial parameters in Firestore:
    companies/{companyId} -> total_budget, min_cash_reserve, loan_facility, discount_rate, planning_period, max_risk_level
    """
    company_id = payload.company_id or f"comp_{uuid.uuid4().hex[:8]}"
    company_data = payload.model_dump()
    company_data["company_id"] = company_id
    
    saved = save_company(company_id, company_data)
    return CompanyResponse(**saved)

@router.get("/company/{company_id}", response_model=CompanyResponse)
def fetch_company(company_id: str):
    company = get_company(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID '{company_id}' not found."
        )
    return CompanyResponse(**company)

@router.post("/project", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def add_project(payload: ProjectCreate):
    """
    Adds a project under a company in Firestore:
    companies/{companyId}/projects/{projectId}
    """
    company_id = payload.company_id or "default_company"
    project_id = payload.project_id or f"proj_{uuid.uuid4().hex[:8]}"

    if payload.initial_cost <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Initial project cost must be strictly greater than 0."
        )
    if payload.duration_years <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Project duration must be at least 1 year."
        )
    if not payload.cash_flows or len(payload.cash_flows) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cash flows array must contain at least one period."
        )
    if len(payload.cash_flows) != payload.duration_years:
        if len(payload.cash_flows) < payload.duration_years:
            last_flow = payload.cash_flows[-1]
            payload.cash_flows.extend([last_flow] * (payload.duration_years - len(payload.cash_flows)))
        else:
            payload.cash_flows = payload.cash_flows[:payload.duration_years]

    project_data = payload.model_dump()
    project_data["company_id"] = company_id
    project_data["project_id"] = project_id

    saved = save_project(company_id, project_id, project_data)
    return ProjectResponse(**saved)

@router.get("/projects/{company_id}", response_model=List[ProjectResponse])
def list_company_projects(company_id: str):
    projects = get_projects(company_id)
    return [ProjectResponse(**p) for p in projects]

@router.post("/upload-projects")
async def upload_projects(
    company_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Accepts .csv or .xlsx file containing project proposals.
    Cleans, imputes missing values, validates inputs, and bulk-saves to Firestore under companies/{companyId}/projects.
    """
    if not file.filename.lower().endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid file format. Only CSV (.csv) and Excel (.xlsx, .xls) files are supported."
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty."
        )

    projects, errors = parse_and_clean_file(file_bytes, file.filename)

    if not projects and errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Failed to parse any valid project rows.", "errors": errors}
        )

    saved_projects = []
    for p in projects:
        proj_id = f"proj_{uuid.uuid4().hex[:8]}"
        p_dict = p.model_dump()
        p_dict["company_id"] = company_id
        p_dict["project_id"] = proj_id
        saved = save_project(company_id, proj_id, p_dict)
        saved_projects.append(ProjectResponse(**saved))

    return {
        "success": True,
        "company_id": company_id,
        "uploaded_count": len(saved_projects),
        "projects": saved_projects,
        "warnings": errors if errors else None
    }

@router.get("/sample-template")
def get_sample_template():
    """
    Returns CSV template matching the Part 6 spec worked example for easy onboarding.
    """
    from fastapi.responses import PlainTextResponse
    csv_content = (
        "name,initial_cost,cash_flows,risk_category,industry_category,duration_years\n"
        "Solar installation,800000,\"[300000, 300000, 300000, 300000, 300000]\",Medium,CleanTech,5\n"
        "Recycling unit,600000,\"[250000, 250000, 250000, 250000, 250000]\",Medium,Environmental,5\n"
        "Software product,500000,\"[240000, 240000, 240000, 240000, 240000]\",High,Software,5\n"
        "Energy-efficient equipment,400000,\"[180000, 180000, 180000, 180000, 180000]\",Low,Energy,5\n"
    )
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=venturelens_projects_template.csv"}
    )


@router.post("/analyze")
def analyze_company_projects(payload: AnalysisRequest):
    """
    Given a companyId, runs:
    1. Preprocessing & verification
    2. ML revenue confidence multiplier & risk score estimation
    3. Deterministic textbook finance engine (NPV, IRR, Payback, Break-Even, Timeline, Funding)
    Returns detailed metrics per project.
    """
    company_id = payload.company_id
    company = get_company(company_id)
    if not company:
        # Default fallback company profile if user jumped straight to analysis
        company = {
            "company_id": company_id,
            "total_investment_budget": 2000000.0,
            "min_cash_reserve": 200000.0,
            "loan_facility": 500000.0,
            "discount_rate": 0.12,
            "planning_period_years": 5,
            "max_acceptable_risk": "Medium"
        }
        save_company(company_id, company)

    projects_raw = get_projects(company_id)
    if not projects_raw:
        return {
            "company_id": company_id,
            "company": company,
            "projects": [],
            "message": "No projects found for this company. Add projects or upload a CSV."
        }

    discount_rate = float(company.get("discount_rate", 0.12))
    budget = float(company.get("total_investment_budget", 2000000.0))
    reserve = float(company.get("min_cash_reserve", 200000.0))
    loan_fac = float(company.get("loan_facility", 500000.0))

    analyzed_projects = []
    for p in projects_raw:
        pid = p["project_id"]
        name = p.get("name", pid)
        cost = float(p.get("initial_cost", 0.0))
        flows = [float(x) for x in p.get("cash_flows", [])]
        duration = int(p.get("duration_years", len(flows)))
        risk_cat = str(p.get("risk_category", "Medium"))
        ind_cat = str(p.get("industry_category", "Software"))

        # 1. ML predictions on real historical models
        risk_score, conf_mult = predict_project_risk_and_confidence(
            industry_category=ind_cat,
            risk_category=risk_cat,
            duration_years=duration,
            initial_cost=cost,
            funding_rounds=p.get("funding_rounds"),
            relationships=p.get("relationships"),
            milestones=p.get("milestones"),
            age_years=p.get("age_years")
        )

        # 2. Rule-based scenario generator
        scenarios = generate_deterministic_scenarios(flows, conf_mult)

        # 3. Deterministic Financial Analysis Engine
        npv = calculate_npv(flows, discount_rate=discount_rate, initial_cost=cost)
        irr = calculate_irr(flows, initial_cost=cost)
        pb = calculate_payback_period(flows, initial_cost=cost)
        dpb = calculate_discounted_payback_period(flows, discount_rate=discount_rate, initial_cost=cost)
        pi = calculate_profitability_index(flows, discount_rate=discount_rate, initial_cost=cost)
        
        # Break-even estimation assuming 30% fixed cost overhead and standard margin
        be = calculate_break_even_point(
            fixed_costs=cost * 0.30,
            price_per_unit=100.0,
            variable_cost_per_unit=60.0
        )

        # Cash flow timeline with reserve breach flagging
        timeline_raw = calculate_cash_flow_timeline(
            initial_balance=budget,
            cash_flows=flows,
            min_cash_reserve=reserve,
            initial_cost=cost
        )
        timeline = [CashFlowTimelinePoint(**pt) for pt in timeline_raw]

        # Funding analysis
        funding = calculate_funding_analysis(
            total_cost=cost,
            available_budget=budget,
            loan_facility=loan_fac
        )

        project_fin = ProjectFinancials(
            project_id=pid,
            name=name,
            initial_cost=cost,
            npv=npv,
            irr=irr,
            payback_period=pb,
            discounted_payback_period=dpb,
            profitability_index=pi,
            break_even_units=be.get("break_even_units"),
            risk_score=risk_score,
            confidence_multiplier=conf_mult,
            risk_category=risk_cat,
            industry_category=ind_cat,
            duration_years=duration,
            scenarios=scenarios,
            cash_flow_timeline=timeline,
            funding_analysis=funding
        )
        analyzed_projects.append(project_fin)

    return {
        "company_id": company_id,
        "company": company,
        "projects": analyzed_projects
    }


@router.post("/optimize", response_model=OptimizationResponse)
def optimize_company_portfolio(payload: OptimizationRequest):
    """
    Given a companyId (and optional overrides):
    1. Prepares candidate projects and runs analysis
    2. Runs PuLP 0-1 binary integer linear programming optimization
    3. Computes naive greedy comparison and rule-based rejection reasons
    4. Writes run result to Firestore under companies/{companyId}/runs/{runId}
    5. Returns full allocation response
    """
    company_id = payload.company_id
    company = get_company(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID '{company_id}' not found. Please create company first."
        )

    projects_raw = get_projects(company_id)
    if not projects_raw:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No projects registered for optimization. Please add projects first."
        )

    # Apply overrides if present
    budget = float(payload.override_budget or company.get("total_investment_budget", 2000000.0))
    discount_rate = float(payload.override_discount_rate or company.get("discount_rate", 0.12))
    max_risk = str(payload.override_max_risk or company.get("max_acceptable_risk", "Medium"))
    reserve = float(company.get("min_cash_reserve", 200000.0))
    loan_fac = float(company.get("loan_facility", 500000.0))

    # Evaluate candidate project metrics
    candidates = []
    for p in projects_raw:
        pid = p["project_id"]
        cost = float(p.get("initial_cost", 0.0))
        flows = [float(x) for x in p.get("cash_flows", [])]
        duration = int(p.get("duration_years", len(flows)))
        risk_cat = str(p.get("risk_category", "Medium"))
        ind_cat = str(p.get("industry_category", "Software"))

        risk_score, _ = predict_project_risk_and_confidence(
            industry_category=ind_cat,
            risk_category=risk_cat,
            duration_years=duration,
            initial_cost=cost
        )
        npv = calculate_npv(flows, discount_rate=discount_rate, initial_cost=cost)

        candidates.append({
            "project_id": pid,
            "name": p.get("name", pid),
            "initial_cost": cost,
            "npv": npv,
            "risk_score": risk_score,
            "risk_category": risk_cat,
        })

    # Run optimizer
    opt_result = solve_portfolio_allocation(
        projects=candidates,
        total_budget=budget,
        min_cash_reserve=reserve,
        max_acceptable_risk=max_risk,
        loan_facility=loan_fac,
        allow_loan_usage=False
    )

    run_id = f"run_{uuid.uuid4().hex[:8]}"
    timestamp = datetime.now(timezone.utc).isoformat()

    allocations_list = [AllocationItem(**a) for a in opt_result["allocations"]]

    run_record = {
        "run_id": run_id,
        "company_id": company_id,
        "timestamp": timestamp,
        "total_budget": budget,
        "min_cash_reserve": reserve,
        "allocated_budget": opt_result["allocated_budget"],
        "unallocated_budget": opt_result["unallocated_budget"],
        "budget_utilization_pct": opt_result["budget_utilization_pct"],
        "selected_count": opt_result["selected_count"],
        "total_projects": opt_result["total_projects"],
        "total_npv_optimized": opt_result["total_npv_optimized"],
        "total_npv_naive": opt_result["total_npv_naive"],
        "optimization_uplift_pct": opt_result["optimization_uplift_pct"],
        "portfolio_risk_score": opt_result["portfolio_risk_score"],
        "allocations": [a.model_dump() for a in allocations_list],
        "naive_selection": opt_result["naive_selected_ids"],
        "ai_recommendation": opt_result["ai_explanation"],
        "constraints_summary": {
            "budget": budget,
            "min_cash_reserve": reserve,
            "max_acceptable_risk": max_risk,
            "discount_rate": discount_rate,
        }
    }

    # Save to Firestore collection companies/{companyId}/runs/{runId}
    save_run(company_id, run_id, run_record)

    return OptimizationResponse(**run_record)


@router.get("/runs/{company_id}", response_model=List[OptimizationResponse])
def get_company_runs_history(company_id: str):
    """
    Fetches the historical record of all optimization runs executed by this company from Firestore.
    """
    runs = get_runs(company_id)
    return [OptimizationResponse(**r) for r in runs]

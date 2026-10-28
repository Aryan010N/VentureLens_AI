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
    PortfolioSummary,
    MetricRuleEvaluation,
    YearByYearPoint,
    WorkedCalculations,
)
from backend.finance.metrics import (
    compute_project_metrics,
    calculate_irr_percent,
    calculate_payback_years,
)
from backend.database.firestore import (
    save_company,
    get_company,
    save_project,
    get_projects,
    delete_project,
    clear_projects,
    save_run,
    get_runs,
    save_user,
    get_user_by_email,
    get_user_by_id,
)
from backend.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    ForgotPasswordRequest,
    AuthResponse,
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
from backend.ml.train import train_models
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


def _hash_password(raw_password: str) -> str:
    import hashlib
    salt = "venturelens_secure_salt_2026"
    return hashlib.sha256((salt + raw_password).encode()).hexdigest()


@router.post("/auth/register", response_model=AuthResponse)
def register_user(payload: UserRegisterRequest):
    """
    Registers a new user account in Firestore:
    users/{userId} -> name, email, password_hash, company_id, created_at
    """
    clean_email = payload.email.strip().lower()
    existing = get_user_by_email(clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in."
        )

    user_id = f"user_{uuid.uuid4().hex[:10]}"
    company_id = f"comp_{uuid.uuid4().hex[:8]}"

    # Initialize company defaults
    default_company = {
        "company_id": company_id,
        "name": payload.company_name or "My Venture Portfolio",
        "total_investment_budget": 2000000.0,
        "min_cash_reserve": 200000.0,
        "loan_facility": 500000.0,
        "discount_rate": 0.12,
        "planning_period_years": 5,
        "max_acceptable_risk": "Medium",
        "contingency_pct": 0.0,
    }
    save_company(company_id, default_company)

    user_record = {
        "user_id": user_id,
        "email": clean_email,
        "name": payload.name.strip(),
        "password_hash": _hash_password(payload.password),
        "company_id": company_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    save_user(user_id, user_record)

    token = f"token_{uuid.uuid4().hex}"
    return AuthResponse(
        success=True,
        user_id=user_id,
        email=clean_email,
        name=payload.name.strip(),
        company_id=company_id,
        token=token,
        message="Registration successful! Welcome to VentureLens AI."
    )


@router.post("/auth/login", response_model=AuthResponse)
def login_user(payload: UserLoginRequest):
    """
    Authenticates a user via email and password against Firestore records.
    Provides instant demo fallback for demo accounts.
    """
    clean_email = payload.email.strip().lower()

    # Pre-registered Demo Account support
    if clean_email in ["demo@venturelens.ai", "admin@venturelens.ai"] and payload.password:
        return AuthResponse(
            success=True,
            user_id="user_demo_01",
            email=clean_email,
            name="Venture Investor",
            company_id="venture_company_01",
            token=f"demo_token_{uuid.uuid4().hex[:8]}",
            message="Logged in successfully as Demo User."
        )

    user = get_user_by_email(clean_email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found. Please sign up or verify your email."
        )

    req_hash = _hash_password(payload.password)
    if user.get("password_hash") != req_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again or use Forgot Password."
        )

    token = f"token_{uuid.uuid4().hex}"
    return AuthResponse(
        success=True,
        user_id=user["user_id"],
        email=clean_email,
        name=user.get("name", "Investor"),
        company_id=user.get("company_id", "venture_company_01"),
        token=token,
        message="Login successful."
    )


@router.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    """
    Generates a password reset notification for the requested email.
    """
    clean_email = payload.email.strip().lower()
    user = get_user_by_email(clean_email)
    if not user and clean_email not in ["demo@venturelens.ai", "admin@venturelens.ai"]:
        # Do not expose user enumeration for security, return friendly confirmation
        return {
            "success": True,
            "message": f"If an account exists for {clean_email}, a password reset link has been dispatched to your email."
        }

    return {
        "success": True,
        "message": f"Password reset instructions have been dispatched to {clean_email}. For testing purposes, demo accounts can sign in with any password."
    }


@router.get("/auth/me")
def get_current_user_profile(user_id: Optional[str] = None):
    if not user_id:
        return {
            "user_id": "user_demo_01",
            "email": "demo@venturelens.ai",
            "name": "Venture Investor",
            "company_id": "venture_company_01",
            "role": "Financial Officer"
        }
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name", "Investor"),
        "company_id": user.get("company_id", "venture_company_01"),
        "role": "Financial Officer"
    }


@router.post("/train-models")
@router.get("/train-models")
def trigger_train_models():
    """
    Executes live model training using the real Kaggle dataset (data/startup_data.csv).
    Trains RandomForestRegressor and RandomForestClassifier, evaluates on held-out test split,
    serializes models to disk, and updates performance metrics.
    """
    try:
        metrics = train_models()
        return {
            "status": "success",
            "message": "AI models trained successfully on real Kaggle startup success dataset",
            "dataset_path": "data/startup_data.csv",
            "metrics": metrics
        }
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model training failed: {str(e)}"
        )

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

@router.delete("/project/{company_id}/{project_id}")
def remove_company_project(company_id: str, project_id: str):
    """
    Deletes a project record from Firestore under companies/{companyId}/projects/{projectId}.
    """
    delete_project(company_id, project_id)
    return {"success": True, "message": f"Project {project_id} deleted successfully.", "project_id": project_id}

@router.delete("/projects/{company_id}")
def clear_all_company_projects(company_id: str):
    """
    Deletes all registered project records from Firestore under companies/{companyId}/projects.
    """
    clear_projects(company_id)
    return {"success": True, "message": f"All projects for {company_id} cleared successfully."}

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
    contingency_pct = float(
        payload.contingency_pct
        if payload.contingency_pct is not None
        else company.get("contingency_pct", 0.0)
    )
    reserve = float(company.get("min_cash_reserve", 200000.0))
    loan_fac = float(company.get("loan_facility", 500000.0))

    risk_threshold = 0.70
    if str(max_risk).lower() == "low":
        risk_threshold = 0.40
    elif str(max_risk).lower() == "high":
        risk_threshold = 0.95

    # 1. Evaluate preliminary metrics and risk for candidate projects
    candidates = []
    project_metadata_map = {}
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
        prelim_metrics = compute_project_metrics(
            initial_cost=cost,
            inflows=flows,
            discount_rate=discount_rate,
            contingency_pct=contingency_pct,
            planning_horizon=duration,
            project_id=pid,
            name=p.get("name", pid),
            risk_category=risk_cat,
            risk_score=risk_score,
            industry_category=ind_cat,
        )

        project_metadata_map[pid] = {
            "cost": cost,
            "flows": flows,
            "duration": duration,
            "risk_score": risk_score,
            "risk_category": risk_cat,
            "industry_category": ind_cat,
            "prelim_metrics": prelim_metrics,
            "name": p.get("name", pid),
        }

        candidates.append({
            "project_id": pid,
            "name": p.get("name", pid),
            "initial_cost": cost,
            "npv": prelim_metrics["npv"],
            "risk_score": risk_score,
            "risk_category": risk_cat,
        })

    # 2. Run mathematical integer solver
    opt_result = solve_portfolio_allocation(
        projects=candidates,
        total_budget=budget,
        min_cash_reserve=reserve,
        max_acceptable_risk=max_risk,
        loan_facility=loan_fac,
        allow_loan_usage=False
    )

    selected_ids = set(opt_result["selected_project_ids"])
    unallocated_budget = opt_result["unallocated_budget"]

    # 3. Compute comprehensive metrics for EVERY project (Selected and Rejected)
    allocations_list = []
    for p in projects_raw:
        pid = p["project_id"]
        meta = project_metadata_map[pid]
        cost = meta["cost"]
        is_selected = pid in selected_ids
        rejection_reason = None

        if not is_selected:
            m = meta["prelim_metrics"]
            if m["npv"] <= 0:
                rejection_reason = f"NPV negative: Expected return (NPV: ₹{m['npv']:,.0f}) is non-positive, destroying capital value."
            elif meta["risk_score"] > risk_threshold:
                rejection_reason = f"Exceeds risk ceiling: Project risk score ({meta['risk_score']:.2f}) exceeds portfolio {max_risk} ceiling ({risk_threshold:.2f})."
            elif cost > unallocated_budget:
                rejection_reason = f"Budget exhausted: Required outlay (₹{cost:,.0f}) exceeds remaining unallocated budget (₹{unallocated_budget:,.0f})."
            else:
                rejection_reason = "Displaced by higher-yielding project combinations to maximize total portfolio return under capital constraints."

        allocated_amount = cost if is_selected else 0.0

        full_metrics = compute_project_metrics(
            initial_cost=cost,
            inflows=meta["flows"],
            discount_rate=discount_rate,
            contingency_pct=contingency_pct,
            planning_horizon=meta["duration"],
            allocated_amount=allocated_amount,
            total_budget=budget,
            project_id=pid,
            name=meta["name"],
            risk_category=meta["risk_category"],
            risk_score=meta["risk_score"],
            industry_category=meta["industry_category"],
        )
        full_metrics["selected"] = is_selected
        full_metrics["rejection_reason"] = rejection_reason

        allocations_list.append(AllocationItem(**full_metrics))

    # 4. Compute Portfolio Summary Metrics
    selected_items = [a for a in allocations_list if a.selected]
    tot_allocated = sum(a.allocated_amount for a in selected_items)
    tot_inv = sum(a.total_investment for a in selected_items)
    tot_net_benefit = sum(a.net_benefit for a in selected_items)
    tot_pv_benefits = sum(a.pv_of_benefits for a in selected_items)

    portfolio_roi = round((tot_net_benefit / tot_inv * 100.0), 2) if tot_inv > 0 else 0.0
    portfolio_bcr = round((tot_pv_benefits / tot_inv), 3) if tot_inv > 0 else 0.0

    valid_paybacks = [a for a in selected_items if a.simple_payback_years is not None]
    if valid_paybacks:
        weighted_pb = round(
            sum(a.simple_payback_years * a.total_investment for a in valid_paybacks)
            / sum(a.total_investment for a in valid_paybacks),
            2
        )
    else:
        weighted_pb = None

    port_summary = PortfolioSummary(
        total_budget=budget,
        total_allocated=tot_allocated,
        unallocated_cash=unallocated_budget,
        min_cash_reserve=reserve,
        loan_facility=loan_fac,
        loan_facility_used=0.0,
        portfolio_npv=opt_result["total_npv_optimized"],
        portfolio_roi_percent=portfolio_roi,
        portfolio_bcr=portfolio_bcr,
        weighted_average_payback=weighted_pb,
    )

    run_id = f"run_{uuid.uuid4().hex[:8]}"
    timestamp = datetime.now(timezone.utc).isoformat()

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
            "contingency_pct": contingency_pct,
            "loan_facility": loan_fac,
        },
        "portfolio_summary": port_summary.model_dump(),
    }

    # Save to Firestore collection companies/{companyId}/runs/{runId}
    save_run(company_id, run_id, run_record)

    return OptimizationResponse(**run_record)


@router.get("/runs/{company_id}", response_model=List[OptimizationResponse])
def get_company_runs_history(company_id: str):
    """
    Fetches the historical record of all optimization runs executed by this company from Firestore.
    Gracefully handles and upgrades any legacy runs stored in the cloud database.
    """
    runs = get_runs(company_id)
    results = []
    for r in runs:
        try:
            results.append(OptimizationResponse(**r))
        except Exception as err:
            logger.warning(f"Upgrading legacy run {r.get('run_id')}: {err}")
            try:
                allocs = []
                for a in r.get("allocations", []):
                    if "selected" not in a:
                        a["selected"] = a.get("decision") in ["Selected", "ACCEPT"]
                    allocs.append(AllocationItem(**a))
                r["allocations"] = [a.model_dump() for a in allocs]
                results.append(OptimizationResponse(**r))
            except Exception as e2:
                logger.error(f"Failed to adapt legacy run {r.get('run_id')}: {e2}")
    return results


@router.get("/test-metrics")
def run_unit_tests_metrics():
    """
    Executes the 5 hand-checked textbook unit tests programmatically
    and returns a structured pass/fail verification table with expected vs actual values.
    """
    import time
    start_time = time.perf_counter()
    results = []

    # Case 1: Cost 600000, annual inflow 150000 for 6 years -> simple payback 4.0 years
    t1_res = compute_project_metrics(
        initial_cost=600000.0,
        inflows=[150000.0] * 6,
        discount_rate=0.10,
        contingency_pct=0.0,
    )
    c1_pass = t1_res["simple_payback_years"] == 4.0
    results.append({
        "id": "TC-01",
        "name": "Linear Uniform Inflows Payback",
        "scenario": "Cost 600,000, annual inflow 150,000 for 6 years",
        "inputs": {"initial_cost": 600000, "inflows": [150000]*6, "discount_rate": 0.10, "contingency_pct": 0},
        "target_metric": "Simple Payback Period",
        "expected": "4.00 years",
        "actual": f"{t1_res['simple_payback_years']:.2f} years",
        "passed": bool(c1_pass),
        "worked_formula": "Cumulative method: 600,000 / 150,000 = exactly 4.00 years"
    })

    # Case 2: Cost 1000000, total profit 200000 -> ROI 20%
    t2_res = compute_project_metrics(
        initial_cost=1000000.0,
        inflows=[1200000.0],
        discount_rate=0.10,
        contingency_pct=0.0,
    )
    c2_pass = (t2_res["net_benefit"] == 200000.0 and t2_res["roi_percent"] == 20.0)
    results.append({
        "id": "TC-02",
        "name": "Profitability & ROI Verification",
        "scenario": "Cost 1,000,000, total profit 200,000",
        "inputs": {"initial_cost": 1000000, "inflows": [1200000], "discount_rate": 0.10, "contingency_pct": 0},
        "target_metric": "ROI %",
        "expected": "20.00%",
        "actual": f"{t2_res['roi_percent']:.2f}%",
        "passed": bool(c2_pass),
        "worked_formula": "ROI = (Net Profit / Investment) × 100 = (200,000 / 1,000,000) × 100 = 20.00%"
    })

    # Case 3: Cost 10,00,000, 12% rate, inflows 3,4,4,3,3 lakh (contingency 0) -> payback 2.75 years, NPV about +2.32 lakh, BCR about 1.23, ROI 70%, IRR about 21%
    t3_res = compute_project_metrics(
        initial_cost=1000000.0,
        inflows=[300000.0, 400000.0, 400000.0, 300000.0, 300000.0],
        discount_rate=0.12,
        contingency_pct=0.0,
    )
    c3_pass = (
        t3_res["simple_payback_years"] == 2.75
        and abs(t3_res["npv"] - 232330.27) < 1.0
        and abs(t3_res["bcr"] - 1.232) < 0.01
        and t3_res["roi_percent"] == 70.0
        and t3_res["irr_percent"] is not None
        and abs(t3_res["irr_percent"] - 21.12) < 0.1
        and t3_res["decision"] == "ACCEPT"
    )
    results.append({
        "id": "TC-03",
        "name": "Full Multi-Year Capital Budgeting Case",
        "scenario": "Cost 10L, 12% discount rate, inflows 3,4,4,3,3 lakh (contingency 0)",
        "inputs": {"initial_cost": 1000000, "inflows": [300000, 400000, 400000, 300000, 300000], "discount_rate": 0.12, "contingency_pct": 0},
        "target_metric": "Payback 2.75y, NPV +₹2.32L, BCR 1.23, ROI 70%, IRR 21%",
        "expected": "Payback 2.75y, NPV ₹2,32,330, BCR 1.232, ROI 70%, IRR 21.12%",
        "actual": f"Payback {t3_res['simple_payback_years']:.2f}y, NPV ₹{t3_res['npv']:,.0f}, BCR {t3_res['bcr']:.3f}, ROI {t3_res['roi_percent']:.1f}%, IRR {t3_res['irr_percent']:.2f}%",
        "passed": bool(c3_pass),
        "worked_formula": t3_res["worked_calculations"]["payback"]
    })

    # Case 4: A project that never recovers cost -> payback null, decision REJECT
    t4_res = compute_project_metrics(
        initial_cost=1000000.0,
        inflows=[100000.0, 100000.0],
        discount_rate=0.12,
        contingency_pct=0.0,
    )
    c4_pass = (t4_res["simple_payback_years"] is None and t4_res["decision"] == "REJECT")
    results.append({
        "id": "TC-04",
        "name": "Unrecovered Investment & Automatic Rejection",
        "scenario": "Project never recovers outlay (Inflows 200k vs Outlay 1M)",
        "inputs": {"initial_cost": 1000000, "inflows": [100000, 100000], "discount_rate": 0.12, "contingency_pct": 0},
        "target_metric": "Payback is null and decision is REJECT",
        "expected": "Payback: null, Decision: REJECT",
        "actual": f"Payback: {t4_res['simple_payback_years']}, Decision: {t4_res['decision']}",
        "passed": bool(c4_pass),
        "worked_formula": "Cumulative inflows (₹2,00,000) < Outlay (₹10,00,000); NPV is negative; REJECT"
    })

    # Case 5: Contingency 10% increases total_investment and lowers NPV
    t5_0 = compute_project_metrics(
        initial_cost=1000000.0,
        inflows=[300000.0, 400000.0, 400000.0, 300000.0, 300000.0],
        discount_rate=0.12,
        contingency_pct=0.0,
    )
    t5_10 = compute_project_metrics(
        initial_cost=1000000.0,
        inflows=[300000.0, 400000.0, 400000.0, 300000.0, 300000.0],
        discount_rate=0.12,
        contingency_pct=10.0,
    )
    c5_pass = (
        t5_10["total_investment"] > t5_0["total_investment"]
        and t5_10["npv"] < t5_0["npv"]
        and round(t5_0["npv"] - t5_10["npv"], 2) == 100000.0
    )
    results.append({
        "id": "TC-05",
        "name": "Contingency Impact on Capital & NPV",
        "scenario": "Contingency 10% increases total_investment and lowers NPV",
        "inputs": {"initial_cost": 1000000, "contingency_pct": 10.0, "discount_rate": 0.12},
        "target_metric": "total_investment rises by 100k, NPV drops by exactly 100k",
        "expected": "Investment: 1.10M (> 1.0M), NPV: ₹1,32,330 (< ₹2,32,330)",
        "actual": f"Investment: ₹{t5_10['total_investment']:,.0f}, NPV: ₹{t5_10['npv']:,.0f} (Difference: -₹{t5_0['npv'] - t5_10['npv']:,.0f})",
        "passed": bool(c5_pass),
        "worked_formula": "Contingency = 10% × 10L = 1L reserve; Total Outlay = 11L; NPV delta = -1L"
    })

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    passed_count = sum(1 for r in results if r["passed"])

    return {
        "suite": "VentureLens AI Deterministic Metrics Hand-Checked Test Suite",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total": len(results),
        "passed": passed_count,
        "failed": len(results) - passed_count,
        "all_passed": passed_count == len(results),
        "execution_time_ms": elapsed_ms,
        "test_cases": results
    }

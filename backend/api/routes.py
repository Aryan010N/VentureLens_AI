import uuid
from typing import List
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from backend.schemas.company import CompanyCreate, CompanyResponse
from backend.schemas.project import ProjectCreate, ProjectResponse
from backend.database.firestore import (
    save_company,
    get_company,
    save_project,
    get_projects,
)

router = APIRouter(prefix="/api", tags=["VentureLens Core"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "VentureLens AI - Multi-Project Capital Allocation Advisor",
        "version": "1.0.0"
    }

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
    Validates cost, duration, and cash flow inputs.
    """
    company_id = payload.company_id or "default_company"
    project_id = payload.project_id or f"proj_{uuid.uuid4().hex[:8]}"
    
    # Validation
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
        # Extend or trim gracefully or warn
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

    from backend.preprocessing.clean import parse_and_clean_file
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


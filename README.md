# VentureLens AI — Multi-Project Capital Allocation Advisor
> **FFM CIE-2 Academic Project** | Next.js 14 · FastAPI · Firebase Firestore · PuLP 0-1 Optimization · Scikit-Learn Real Data Models · Deterministic Financial Metrics Engine

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel%20%2B%20Render-teal?style=for-the-badge&logo=vercel)](https://venture-lens-ai-delta.vercel.app)
[![Testing Page](https://img.shields.io/badge/Testing%20Page-5%2F5%20Hand--Checked%20Pass-emerald?style=for-the-badge&logo=pytest)](https://venture-lens-ai-delta.vercel.app/testing)
[![Workflow Spec](https://img.shields.io/badge/Workflow%20Spec-0%20to%20Complete%20Guide-blue?style=for-the-badge&logo=markdown)](WORKFLOW_AND_SPECIFICATION.md)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Aryan010N%2FVentureLens__AI-14b8a6?style=for-the-badge&logo=github)](https://github.com/Aryan010N/VentureLens_AI)
[![Kaggle Dataset](https://img.shields.io/badge/Kaggle-manishkc06%2Fstartup--success--prediction-20beff?style=for-the-badge&logo=kaggle)](https://www.kaggle.com/datasets/manishkc06/startup-success-prediction)
[![Database](https://img.shields.io/badge/Database-Firebase%20Firestore-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com)

> 📖 **Full System Workflow & Financial Engineering Specification**: Read the complete 0-to-Complete technical reference in [**`WORKFLOW_AND_SPECIFICATION.md`**](WORKFLOW_AND_SPECIFICATION.md).

---

## 📌 1. Problem Statement & Corporate Finance Context

In corporate financial management, firms frequently encounter the **Capital Rationing Dilemma**: evaluating proposed capital investments in isolation using simple hurdle rates fails to produce the optimal combination of projects when investment funds are finite. 

A project that appears profitable on a standalone basis might:
1. Exhaust capital required by a more lucrative bundle of complementary initiatives,
2. Breach minimum corporate cash reserve requirements in early deployment years, or
3. Skew aggregate corporate risk beyond executive tolerance.

**VentureLens AI** solves this problem by acting as an end-to-end decision-making system. It combines:
- **Real Historical Machine Learning**: Estimates operational revenue confidence and distress probabilities trained on real startup success data.
- **Deterministic Finance Engine & Metrics Module (`metrics.py`)**: Calculates textbook-correct NPV, IRR (Newton-Raphson/bisection solver), simple and discounted Payback (linear interpolation), BCR, ROI, annual average return, break-even year, cash flow schedules, and contingency reserves.
- **PuLP Mathematical Optimization**: Solves 0-1 binary integer linear programming to maximize portfolio NPV subject to budget caps, risk ceilings, and liquidity reserves, providing clear rule-based rejection justifications for excluded initiatives.

> **Important Disclosure**: ML predictions are estimates based on historical Kaggle startup data, not guaranteed returns. Illustrative spec numbers are used only as UI placeholder values, never as training data.

---

## 📚 2. Full FFM Concept Coverage & The `metrics.py` Engine

| FFM Domain | Metric / Concept | Formula & Rule | Implementation |
| :--- | :--- | :--- | :--- |
| **Capital Contingency** | Contingency Reserve & Total Investment | $\text{Contingency} = \text{Cost} \times \frac{\text{pct}}{100}$, $\text{Total Inv} = \text{Cost} + \text{Contingency}$ | [`backend/finance/metrics.py`](backend/finance/metrics.py) |
| **Capital Budgeting** | Net Present Value ($\text{NPV}$) | $\text{NPV} = \sum_{t=1}^n \frac{CF_t}{(1+r)^t} - \text{Total Inv}$ (> 0 accept) | [`backend/finance/metrics.py`](backend/finance/metrics.py) |
| **Benefit-Cost Index** | Benefit-Cost Ratio ($\text{BCR}$) | $\text{BCR} = \frac{\text{PV of Inflows}}{\text{Total Inv}}$ (> 1.0 accept) | [`backend/finance/metrics.py`](backend/finance/metrics.py) |
| **Return on Investment** | Accounting ROI % | $\text{ROI} = \frac{\text{Net Benefit}}{\text{Total Inv}} \times 100$ | [`backend/finance/metrics.py`](backend/finance/metrics.py) |
| **Average Annual Return** | Annualized Return % | $\text{Annual Return} = \frac{\text{ROI}}{\text{Lifespan}}$ | [`backend/finance/metrics.py`](backend/finance/metrics.py) |
| **Project Rate of Return** | Internal Rate of Return ($\text{IRR}$) | Numerical root solver ($\text{NPV}(r) = 0$), null if no sign change | [`backend/finance/metrics.py`](backend/finance/metrics.py) |
| **Capital Recovery** | Simple Payback Period | Cumulative method + linear interpolation: $(t-1) + \frac{\text{Unrecovered}}{CF_t}$ | [`backend/finance/metrics.py`](backend/finance/metrics.py) |
| **Discounted Recovery** | Discounted Payback Period | Same linear interpolation applied on discounted inflows | [`backend/finance/metrics.py`](backend/finance/metrics.py) |
| **Break-Even Timing** | Break-Even Year | First operating year where cumulative cash flow $\ge 0$ | [`backend/finance/metrics.py`](backend/finance/metrics.py) |
| **Decision Rules** | 0-1 Acceptance Rules | $\text{ACCEPT}$ iff $\text{NPV} > 0 \land \text{BCR} > 1.0 \land \text{IRR} > r$, else $\text{REJECT}$ | [`backend/finance/metrics.py`](backend/finance/metrics.py) |
| **Plain-English Synthesis**| Interpretation Sentence | Generates corporate advisor summary explaining recovery and yield | [`backend/finance/metrics.py`](backend/finance/metrics.py) |
| **Worked Calculations** | Step-by-Step Substitutions | Formatted string showing exact algebraic substitutions (e.g. $2 + \frac{3}{4} = 2.75$y) | [`backend/finance/metrics.py`](backend/finance/metrics.py) |
| **Portfolio Allocation** | Binary Integer 0-1 Knapsack | $\max \sum \text{NPV}_i x_i \text{ s.t. } \sum c_i x_i \le \text{Budget}, \text{Risk} \le \text{Threshold}$ | [`backend/optimization/allocator.py`](backend/optimization/allocator.py) |

---

## 🏛️ 3. System Architecture

```mermaid
graph TD
    User([Corporate Financial Planner]) -->|Enters Budget / Uploads CSV| FE[Next.js 14 Frontend - Tailwind & Recharts]
    FE -->|REST API Requests| BE[FastAPI Backend Server]
    
    subgraph Data Layer
        BE -->|Read/Write Companies, Projects, Runs| FS[(Firebase Firestore Cloud DB)]
        FS -.->|Offline Fallback| MEM[(In-Memory Firestore Emulator)]
    end

    subgraph Data Preprocessing & Validation
        BE --> Clean[Data Cleaning & Missing Value Imputation]
        Clean --> Vector[Feature Normalization & Category Encoding]
    end

    subgraph Machine Learning Pipeline
        Vector --> Reg[RandomForestRegressor: Revenue Realization Factor]
        Vector --> Cls[RandomForestClassifier: Risk & Distress Probability]
        Reg & Cls --> Scen[Deterministic 3-Tier Scenario Generator]
    end

    subgraph Financial Engineering & Metrics Engine
        Scen --> MetricsMod[metrics.py: Deterministic Capital Budgeting & Cash Flow Schedules]
    end

    subgraph Optimization Engine
        MetricsMod --> PuLP[PuLP 0-1 Binary Integer Programming Allocator]
        PuLP --> Naive[Greedy Naive Benchmark Comparison]
        PuLP --> Rej[Rule-Based Rejection Reason Generator]
    end

    PuLP & Naive & Rej --> Out[Decision Dashboard & AI-Templated Executive Summary]
    Out --> FE
```

---

## 🧪 4. Hand-Checked Unit Tests & Testing Page

VentureLens AI includes hand-checked test cases in [`tests/test_metrics.py`](tests/test_metrics.py) and [`backend/tests/test_metrics.py`](backend/tests/test_metrics.py).

### Hand-Checked Test Cases

| Case ID | Scenario Description | Inputs | Expected Hand-Checked Result | Verified Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Linear Constant Inflows Payback | Cost: ₹6,00,000, Annual Inflow: ₹1,50,000 for 6 years | Simple Payback: **4.00 years** | **PASS** |
| **TC-02** | Accounting Profitability & ROI | Cost: ₹10,00,000, Total Profit: ₹2,00,000 | ROI: **20.00%** | **PASS** |
| **TC-03** | Comprehensive Capital Budgeting | Cost: ₹10,00,000, Rate: 12%, Inflows: 3, 4, 4, 3, 3 Lakh (Contingency: 0) | Payback: **2.75 years**, NPV: **+₹2.32 Lakh**, BCR: **1.232**, ROI: **70%**, IRR: **21.12%**, Decision: **ACCEPT** | **PASS** |
| **TC-04** | Unrecovered Outlay & Rejection | Cost: ₹10,00,000, Inflows: ₹1,00,000, ₹1,00,000 | Payback: **null**, Decision: **REJECT** | **PASS** |
| **TC-05** | Capital Contingency Impact | 10% Contingency on ₹10,00,000 Cost | Total Inv: **₹11,00,000** (increases by 100k), NPV: **₹1,32,330** (lowers by exactly 100k) | **PASS** |

### Live Testing Page
Accessible directly in the application at [`/testing`](https://venture-lens-ai-delta.vercel.app/testing) or via the **"Testing Page (5/5 PASS)"** badge in the header.
The testing page executes [`GET /api/test-metrics`](https://ffm-cie-2.onrender.com/api/test-metrics) dynamically, displaying a live pass/fail table, execution latency, and step-by-step mathematical proofs.

---

## 🗄️ 5. Firebase Firestore Schema & Security Rules

### A. Firestore Collections
```
firestore-root
│
├── users/{userId}
│       email: string (e.g. "investor@venturelens.ai")
│       name: string (e.g. "Jane Doe")
│       password_hash: string (SHA-256 + secure salt)
│       company_id: string (e.g. "venture_company_01")
│       created_at: ISO8601 string
│
└── companies/{companyId}
    │   total_budget: number (e.g. 2000000)
    │   min_cash_reserve: number (e.g. 200000)
    │   loan_facility: number (e.g. 500000)
    │   discount_rate: number (e.g. 0.12)
    │   planning_period: number (e.g. 5)
    │   max_risk_level: string ("Low" | "Medium" | "High")
    │   contingency_pct: number (e.g. 10.0)
    │   created_at: ISO8601 string
    │
    ├── projects/{projectId}
    │       name: string (e.g. "Solar installation")
    │       initial_cost: number (e.g. 800000)
    │       cash_flows: array<number> [300000, 300000, 300000, 300000, 300000]
    │       risk_score: number (e.g. 0.19, evaluated by Machine Learning)
    │       risk_category: string ("Low" | "Medium" | "High", AI-predicted)
    │       industry_category: string ("CleanTech", "Software", etc.)
    │       duration: number (e.g. 5)
    │       created_at: ISO8601 string
    │
    └── runs/{runId}
            run_id: string
            timestamp: ISO8601 string
            allocated_budget: number
            unallocated_budget: number
            budget_utilization_pct: number
            selected_count: number
            total_projects: number
            total_npv_optimized: number
            total_npv_naive: number
            optimization_uplift_pct: number
            portfolio_risk_score: number
            allocations: array<AllocationItem>
            ai_recommendation: string
            constraints_summary: object
            portfolio_summary: object
```

### B. Firestore Security Rules
Paste these rules in Firebase Console under **Firestore Database $\rightarrow$ Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if true;
    }
    match /companies/{companyId}/{document=**} {
      allow read, write: if true;
    }
  }
}
```

### C. Firebase Authentication Setup
To enable native Email/Password user management in the Firebase Console:
1. Navigate to [Firebase Console](https://console.firebase.google.com/project/fm-cie-2/authentication).
2. Go to **Authentication** $\rightarrow$ **Sign-in method**.
3. Click **Email/Password** $\rightarrow$ Toggle **Enable** to **ON** $\rightarrow$ Click **Save**.
*(Our FastAPI backend securely handles login and signup directly via Firestore `users/{userId}` with demo accounts active out of the box).*

---

## 📊 6. Real Dataset Citation & Machine Learning Architecture

### Real Kaggle Dataset
- **Kaggle Dataset Slug**: [`manishkc06/startup-success-prediction`](https://www.kaggle.com/datasets/manishkc06/startup-success-prediction)
- **Local Data File**: [`data/startup_data.csv`](data/startup_data.csv) (923 historical company venture records, 49 columns)
- **Features Used**: `funding_rounds`, `milestones`, `relationships`, `age_last_funding_year`, `avg_participants`, `is_software`, `is_enterprise`, `is_biotech`, `is_ecommerce`
- **Data Split**: 80% Train (738 samples) / 20% Held-Out Test (185 samples), stratified on binary outcome.

### Trained AI Model Artifacts
All models are trained strictly on real data with **NO hardcoded weights**:
1. **Revenue Confidence Regressor**: [`backend/models/revenue_model.pkl`](backend/models/revenue_model.pkl)
   - Algorithm: `RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)`
   - Metrics on held-out test split: **$R^2 = 0.8678$**, **$\text{MAE} = 0.0437$**, **$\text{RMSE} = 0.0556$**
   - Role: Predicts cash flow realization confidence multiplier ($0.45 \le \text{multiplier} \le 0.98$).
2. **Operational Risk Classifier**: [`backend/models/risk_model.pkl`](backend/models/risk_model.pkl)
   - Algorithm: `RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)`
   - Metrics on held-out test split: **$\text{ROC-AUC} = 0.8176$**, **Accuracy = 77.84%**, **Precision = 80.15%**, **F1 = 0.8367**
   - Role: Predicts venture distress probability ($P(\text{distress}) = 1 - P(\text{success})$).

### Live Model Training Execution
Model training is completely dynamic and can be triggered in 3 ways:
1. **Interactive UI**: View model metrics or trigger on-demand retraining under **Tests & Proofs (`/testing`)** or **Account (`/account`)**, keeping the main Budget Planner dashboard ultra-clean and distraction-free.
2. **REST API**: Call `POST /api/train-models` or `GET /api/train-models` on the FastAPI backend.
3. **CLI Script**: Run `python backend/ml/train.py` from the project root.

---

## 🧮 7. Fully Worked Example (Spec Scenario Verification)

### Company Financial Constraints
- **Available Investment Budget**: ₹20,00,000 (₹20 Lakh)
- **Minimum Cash Reserve**: ₹2,00,000 (₹2 Lakh)
- **Available Loan Facility**: ₹5,00,000 (₹5 Lakh)
- **Cost of Capital (Discount Rate)**: 12%
- **Evaluation Period**: 5 Years
- **Max Acceptable Risk**: Medium

### Candidate Project Proposals
| Project Name | Initial Cost | Expected Annual Inflow (5 Yrs) | Discounted NPV (@ 12%) | IRR | Payback | Assessed Risk |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Solar installation** | ₹8,00,000 | ₹3,00,000 | +₹2,81,433 | 24.52% | 2.67 Yrs | Medium |
| **Recycling unit** | ₹6,00,000 | ₹2,50,000 | +₹3,01,194 | 30.54% | 2.40 Yrs | Medium |
| **Software product** | ₹5,00,000 | ₹2,40,000 | +₹3,65,146 | 39.58% | 2.08 Yrs | High |
| **Energy-efficient equipment** | ₹4,00,000 | ₹1,80,000 | +₹2,48,860 | 34.90% | 2.22 Yrs | Low |

### PuLP Mathematical Optimization Outcome
```
Maximize:   281,433 * x_Solar + 301,194 * x_Recycling + 365,146 * x_Software + 248,860 * x_Energy
Subject to: 800,000 * x_Solar + 600,000 * x_Recycling + 500,000 * x_Software + 400,000 * x_Energy <= 2,000,000
            x_i in {0, 1}
```

#### Optimization Result:
- **Projects Selected**: **3 of 4** (`Solar installation`, `Recycling unit`, `Software product`)
- **Investment Allocated**: **₹19,00,000 (95.0% of budget)**
- **Unallocated Budget**: **₹1,00,000 (Preserved as safe reserve)**
- **Total Portfolio NPV**: **+₹9,47,773**
- **Excluded Project**: `Energy-efficient equipment`
- **Rejection Reason**: *"Exceeds remaining unallocated budget (Cost: ₹4,00,000 vs Remaining: ₹1,00,000, Deficit: ₹3,00,000). Displaced by higher-yielding project combinations."*

---

## 🚀 8. Installation & Local Verification

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup & Test Execution
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Run all 27 unit tests (including tests/test_metrics.py)
python -m pytest -v

# Start FastAPI backend
uvicorn backend.main:app --reload --port 8000
```
Backend API will be accessible at `http://127.0.0.1:8000` (Swagger docs at `/docs`).

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run dev
```
Open `http://localhost:3000` in your browser. Click **"Load Spec Worked Example (₹20L)"** to run the complete end-to-end analysis. Navigate to `/testing` to view the unit test verification table.

---

## ☁️ 9. Cloud Deployment & Live Environments

- **Production Frontend (Vercel)**: [https://venture-lens-ai-delta.vercel.app](https://venture-lens-ai-delta.vercel.app)
- **Live Testing Verification**: [https://venture-lens-ai-delta.vercel.app/testing](https://venture-lens-ai-delta.vercel.app/testing)
- **Production Backend (Render)**: [https://ffm-cie-2.onrender.com](https://ffm-cie-2.onrender.com)
- **API Health Check**: [https://ffm-cie-2.onrender.com/api/health](https://ffm-cie-2.onrender.com/api/health)
- **API Test Suite Execution**: [https://ffm-cie-2.onrender.com/api/test-metrics](https://ffm-cie-2.onrender.com/api/test-metrics)

---

## 👥 Credits & Academic Evaluation
- **Course**: Foundations of Financial Management (FFM) CIE-2
- **Topic**: Emerging Technology in Financial Decision-Making — Machine Learning & Mathematical Capital Allocation
- **Repository**: [https://github.com/Aryan010N/VentureLens_AI](https://github.com/Aryan010N/VentureLens_AI)

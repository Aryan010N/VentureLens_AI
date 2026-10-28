"""
VentureLens AI — Root metrics module re-export.
Allows direct import via `from backend.metrics import ...` or `import metrics`.
"""

from backend.finance.metrics import (
    calculate_irr_percent,
    calculate_payback_years,
    compute_project_metrics,
)

__all__ = [
    "calculate_irr_percent",
    "calculate_payback_years",
    "compute_project_metrics",
]

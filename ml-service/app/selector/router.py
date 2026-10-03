"""HTTP endpoint for the Product Selector."""
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from .scoring import WEIGHTS, Requirement, explain, recommend

router = APIRouter(tags=["Product selector"])


class ProductIn(BaseModel):
    id: int
    modelName: str
    name: str
    category: Literal["AIR_COMPRESSOR", "VACUUM_PUMP"]
    type: str
    airflowCfm: float
    pressureBar: float
    powerKw: float
    phase: Literal["SINGLE", "THREE"]
    applications: str
    price: float | None = None


class RequirementIn(BaseModel):
    category: Literal["AIR_COMPRESSOR", "VACUUM_PUMP"] = "AIR_COMPRESSOR"
    airflowCfm: float = Field(gt=0, description="Required airflow in CFM")
    pressureBar: float = Field(gt=0, description="Compressor: bar needed. Vacuum pump: bar absolute needed")
    phase: Literal["SINGLE", "THREE"]
    application: str = Field(min_length=2)


class SelectRequest(BaseModel):
    requirements: RequirementIn
    products: list[ProductIn]
    topN: int = Field(default=3, ge=1, le=10)


@router.post("/select-products")
def select_products(body: SelectRequest):
    r = body.requirements
    req = Requirement(
        category=r.category,
        airflow_cfm=r.airflowCfm,
        pressure_bar=r.pressureBar,
        phase=r.phase,
        application=r.application,
    )
    results = recommend([p.model_dump() for p in body.products], req, body.topN)
    return {
        "method": "weighted-scoring",
        "weights": WEIGHTS,
        "results": [
            {
                "rank": i + 1,
                "product": item.product,
                "score": item.score,
                "breakdown": item.breakdown,
                "meetsHardRequirements": item.meets_hard_requirements,
                "explanation": explain(item),
                "reasons": item.reasons,
                "warnings": item.warnings,
            }
            for i, item in enumerate(results)
        ],
    }

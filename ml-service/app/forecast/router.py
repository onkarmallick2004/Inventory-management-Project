"""HTTP endpoint for the parts demand forecast."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from .forecaster import METHOD_LABELS, expected_units, forecast_part, suggested_reorder

router = APIRouter(tags=["Parts forecast"])


class PartHistory(BaseModel):
    partId: int
    partNumber: str
    name: str
    stockQty: int = Field(ge=0)
    minimumLevel: int = Field(ge=0)
    history: list[float] = Field(description="Units used per month, oldest first")


class ForecastRequest(BaseModel):
    months: list[str] = Field(description='Labels for the history, e.g. ["2025-05", ...]')
    parts: list[PartHistory]


@router.post("/forecast-parts")
def forecast_parts(body: ForecastRequest):
    results = []
    for part in body.parts:
        f = forecast_part(part.history)
        forecast = round(f["forecast"], 2)
        reorder = suggested_reorder(f["forecast"], part.stockQty, part.minimumLevel)
        results.append(
            {
                "partId": part.partId,
                "partNumber": part.partNumber,
                "name": part.name,
                "stockQty": part.stockQty,
                "minimumLevel": part.minimumLevel,
                "totalUsed": sum(part.history),
                "lastMonths": part.history[-6:],
                "forecastNextMonth": forecast,
                "forecastUnits": expected_units(f["forecast"]),
                "method": f["method"],
                "methodLabel": METHOD_LABELS[f["method"]],
                "backtestMae": f["backtestMae"],
                "allMethods": f["allMethods"],
                "suggestedReorder": reorder,
            }
        )
    # Most urgent first: biggest reorder, then biggest expected usage.
    results.sort(key=lambda r: (r["suggestedReorder"], r["forecastNextMonth"]), reverse=True)
    return {
        "months": body.months,
        "nextMonthNote": "Forecast is for the month after the last month in the history.",
        "reorderRule": "reorder = forecast (whole units) + minimum level - current stock; parts at or below minimum always get enough to rise above it",
        "results": results,
    }

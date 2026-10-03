"""
ML service: two independent modules behind one small FastAPI app.

  /select-products  -> app/selector  (rule-based weighted scoring)
  /forecast-parts   -> app/forecast  (moving average / smoothing / trend)

The service has no database. The Node backend sends it the data it needs
and shows the results, so each module can be tested and explained on its own.
"""
from fastapi import FastAPI

from .forecast.router import router as forecast_router
from .selector.router import router as selector_router

app = FastAPI(title="Service ML", version="1.0.0", description="Product selector and parts demand forecast")

app.include_router(selector_router)
app.include_router(forecast_router)


@app.get("/health")
def health():
    return {"status": "ok"}

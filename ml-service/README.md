# ML service (Python + FastAPI)

Two independent modules. The service has no database: the Node backend sends it
the data and shows the results.

```bash
cd ml-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000      # docs at http://localhost:8000/docs
pytest                                # unit + API tests for both modules
```

## 1. Product Selector (`app/selector/`)

`POST /select-products` with the customer's requirements and the product catalog.
Each product of the chosen category is scored out of 100:

| Criterion | Points | Rule |
|---|---|---|
| Airflow | 40 | Full if the product gives 100–130% of the needed flow. Loses 30% of the points per 10% it is short; loses points gradually when it is more than 30% too big (energy waste), reaching 0 at 3× the need. |
| Pressure / vacuum | 25 | Compressor: max pressure ≥ need. Vacuum pump: ultimate vacuum at least as deep as need. All or nothing. |
| Power supply | 15 | A three-phase machine on a single-phase site gets 0. |
| Application | 20 | Full if rated for the application, half if general purpose. |

Pressure and power supply are **must-haves**: a product failing either is always
ranked below every product that passes. The response includes the per-criterion
breakdown and a plain-language explanation.

## 2. Parts Demand Forecast (`app/forecast/`)

`POST /forecast-parts` with units used per month for each part (the backend
builds this from closed jobs for the last 12 complete months).

For each part, three classic methods are tried:

1. 3-month moving average
2. Simple exponential smoothing (alpha 0.3)
3. Linear trend (least squares)

Each is replayed over the history ("what would it have predicted last month?")
and the method with the smallest mean absolute error is used for next month.

**Suggested reorder** = forecast (rounded to whole units) + minimum level − current stock,
never below 0. A part already at or below its minimum always gets enough to rise above it,
so the forecast agrees with the low-stock alert.

## Honest limitations (where real company data would help)

- **Demo data is sparse.** The seed has 60 jobs over 18 months spread across 40 parts,
  so most parts were used only a few times and many months are zero. Forecasts are
  therefore small and close to the average. With 2–3 years of real job cards the same
  code would produce much more meaningful numbers, and seasonal effects (e.g. summer
  overheating breakdowns) could be modelled.
- **Lead times are not modelled.** Real supplier lead times per part would let us
  compute a proper reorder point instead of using the minimum level as the buffer.
- **The selector weights are expert guesses**, not learned. Records of which machine
  was actually sold for which enquiry (and whether the customer was happy) would let
  us tune the weights or train a ranking model.
- **Catalog specs are simplified.** Real data sheets (FAD at several pressures, noise,
  duty cycle, air quality class) would make matching more precise.

import pytest
from fastapi.testclient import TestClient

from app.forecast.forecaster import (
    backtest_error, exponential_smoothing, forecast_part, linear_trend, moving_average, suggested_reorder,
)
from app.main import app

client = TestClient(app)


def test_moving_average_uses_last_three_months():
    assert moving_average([10, 0, 3, 6, 9]) == 6


def test_exponential_smoothing_weights_recent_months():
    # level: 10 -> 0.3*20 + 0.7*10 = 13
    assert exponential_smoothing([10, 20]) == pytest.approx(13)


def test_linear_trend_extends_a_straight_line():
    assert linear_trend([1, 2, 3, 4]) == pytest.approx(5)
    assert linear_trend([8, 6, 4, 2]) == pytest.approx(0)   # never negative


def test_constant_demand_forecasts_the_same_value():
    result = forecast_part([4, 4, 4, 4, 4, 4])
    assert result["forecast"] == pytest.approx(4)
    assert result["backtestMae"] == 0


def test_growing_demand_picks_the_trend_method():
    result = forecast_part([1, 2, 3, 4, 5, 6, 7, 8])
    assert result["method"] == "linear_trend"
    assert result["forecast"] == pytest.approx(9)


def test_short_history_falls_back_to_moving_average():
    result = forecast_part([2, 4])
    assert result["method"] == "moving_average"
    assert result["forecast"] == 3


def test_backtest_error_is_mean_absolute_error():
    # Moving average on [2, 2, 2, 5]: predicts 2 for the last month, actual 5 -> error 3
    assert backtest_error(moving_average, [2, 2, 2, 5]) == 3


def test_reorder_quantity():
    assert suggested_reorder(forecast=4.2, stock_qty=3, minimum_level=2) == 3   # 4 + 2 - 3
    assert suggested_reorder(forecast=0.06, stock_qty=3, minimum_level=4) == 2  # below minimum: order enough to reach 5
    assert suggested_reorder(forecast=1, stock_qty=20, minimum_level=2) == 0
    # At the minimum with no expected use: still low stock, so order 1 to get above it.
    assert suggested_reorder(forecast=0, stock_qty=2, minimum_level=2) == 1


def test_api_sorts_most_urgent_first():
    res = client.post("/forecast-parts", json={
        "months": ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"],
        "parts": [
            {"partId": 1, "partNumber": "A", "name": "Plenty", "stockQty": 50, "minimumLevel": 2, "history": [1, 1, 1, 1, 1, 1]},
            {"partId": 2, "partNumber": "B", "name": "Short", "stockQty": 1, "minimumLevel": 3, "history": [5, 5, 5, 5, 5, 5]},
        ],
    })
    assert res.status_code == 200
    results = res.json()["results"]
    assert [r["partNumber"] for r in results] == ["B", "A"]
    assert results[0]["suggestedReorder"] == 7   # 5 + 3 - 1
    assert results[1]["suggestedReorder"] == 0

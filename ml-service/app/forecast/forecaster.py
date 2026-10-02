"""
Parts Demand Forecast: classic, explainable time-series methods.

Input for each part: how many units were used in each past month.
We try three simple methods and keep the one that would have predicted
the past best (smallest average error when replaying history month by month):

  1. Moving average     - average of the last 3 months
  2. Exponential smoothing (alpha = 0.3) - recent months count more
  3. Linear trend       - least-squares straight line, extended one month

Suggested reorder quantity:
    expected use = forecast rounded to whole units (you can't order 0.3 of a filter)
    target stock = expected use + minimum stock level (safety buffer)
    reorder      = target stock - current stock   (never below 0)
    A part that is already low (stock <= minimum, the same rule as the low-stock
    alert) always gets at least enough to lift it above the minimum.

No external libraries are used, so every line can be explained in a viva.
"""
import math

WINDOW = 3     # months used by the moving average
ALPHA = 0.3    # smoothing factor: 0 = never changes, 1 = only last month counts
MIN_HISTORY_FOR_BACKTEST = 4


def moving_average(history: list[float], window: int = WINDOW) -> float:
    if not history:
        return 0.0
    recent = history[-window:]
    return sum(recent) / len(recent)


def exponential_smoothing(history: list[float], alpha: float = ALPHA) -> float:
    if not history:
        return 0.0
    level = history[0]
    for value in history[1:]:
        level = alpha * value + (1 - alpha) * level
    return level


def linear_trend(history: list[float]) -> float:
    """Fits y = a + b*x by least squares and returns the value for the next month."""
    n = len(history)
    if n < 2:
        return history[0] if history else 0.0
    xs = range(n)
    mean_x = (n - 1) / 2
    mean_y = sum(history) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, history))
    den = sum((x - mean_x) ** 2 for x in xs)
    slope = num / den if den else 0.0
    intercept = mean_y - slope * mean_x
    return max(0.0, intercept + slope * n)  # demand can't be negative


METHODS = {
    "moving_average": moving_average,
    "exponential_smoothing": exponential_smoothing,
    "linear_trend": linear_trend,
}

METHOD_LABELS = {
    "moving_average": f"{WINDOW}-month moving average",
    "exponential_smoothing": f"exponential smoothing (alpha {ALPHA})",
    "linear_trend": "linear trend",
}


def backtest_error(method, history: list[float]) -> float:
    """Mean absolute error of one-step-ahead forecasts over the history."""
    errors = []
    for t in range(MIN_HISTORY_FOR_BACKTEST - 1, len(history)):
        predicted = method(history[:t])
        errors.append(abs(predicted - history[t]))
    return sum(errors) / len(errors) if errors else math.inf


def forecast_part(history: list[float]) -> dict:
    """Picks the method with the smallest backtest error and forecasts next month."""
    if len(history) < MIN_HISTORY_FOR_BACKTEST:
        value = moving_average(history)
        return {"method": "moving_average", "forecast": value, "backtestMae": None, "allMethods": {"moving_average": value}}

    errors = {name: backtest_error(fn, history) for name, fn in METHODS.items()}
    best = min(errors, key=errors.get)
    return {
        "method": best,
        "forecast": METHODS[best](history),
        "backtestMae": round(errors[best], 2),
        "allMethods": {name: round(fn(history), 2) for name, fn in METHODS.items()},
    }


def expected_units(forecast: float) -> int:
    """Rounds half up: 0.4 -> 0, 0.5 -> 1, 2.5 -> 3."""
    return math.floor(forecast + 0.5)


def suggested_reorder(forecast: float, stock_qty: int, minimum_level: int) -> int:
    target = expected_units(forecast) + minimum_level
    reorder = max(0, target - stock_qty)
    if stock_qty <= minimum_level:
        reorder = max(reorder, minimum_level + 1 - stock_qty)
    return reorder

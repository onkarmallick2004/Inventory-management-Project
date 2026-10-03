"""
Product Selector: transparent weighted scoring.

Given what the customer needs (airflow, pressure or vacuum level, power supply,
application) we score every catalog product out of 100:

    Criterion      Weight  How it is scored
    -------------  ------  ----------------------------------------------------
    Airflow          40    Full marks if the product gives 100-130% of the
                           required flow. Less if it is too small (can't keep
                           up) or much too big (wastes energy, short-cycles).
    Pressure         25    Compressor: full marks if its max pressure >= need.
                           Vacuum pump: full marks if its ultimate vacuum is at
                           least as deep as needed. Otherwise 0.
    Power supply     15    A three-phase machine on a single-phase site scores 0.
    Application      20    Full marks if the product is rated for the
                           application, half if it is "general" purpose.

Pressure and power supply are HARD requirements: a product that fails either
cannot do the job, so it is ranked below every product that passes.

Every number is explained in plain language, so a customer (or an examiner)
can see exactly why a product was recommended. No training data is needed.
"""
from dataclasses import dataclass, field

WEIGHTS = {"airflow": 40, "pressure": 25, "phase": 15, "application": 20}

# Airflow sizing rules
IDEAL_OVERSIZE = 0.30   # up to 30% more flow than needed is ideal headroom
MAX_OVERSIZE = 2.00     # 200% more than needed (3x) earns no airflow points
UNDERSIZE_PENALTY = 3.0 # every 10% short loses 30% of the airflow points


@dataclass
class Requirement:
    category: str            # "AIR_COMPRESSOR" or "VACUUM_PUMP"
    airflow_cfm: float       # required free air delivery / pumping speed
    pressure_bar: float      # compressor: working pressure needed (bar g)
                             # vacuum pump: vacuum level needed (bar absolute, e.g. 0.01 = 10 mbar)
    phase: str               # "SINGLE" or "THREE": what the site has
    application: str         # e.g. "food", "pharma", "general"


@dataclass
class ScoredProduct:
    product: dict
    score: float
    breakdown: dict
    meets_hard_requirements: bool
    reasons: list = field(default_factory=list)
    warnings: list = field(default_factory=list)


def score_airflow(product_cfm: float, required_cfm: float):
    """Returns (fraction 0..1, explanation)."""
    ratio = product_cfm / required_cfm
    if ratio < 1:
        shortfall = 1 - ratio
        fraction = max(0.0, 1 - shortfall * UNDERSIZE_PENALTY)
        return fraction, f"delivers {product_cfm:g} CFM, {shortfall:.0%} less than the {required_cfm:g} CFM needed"
    oversize = ratio - 1
    if oversize <= IDEAL_OVERSIZE:
        return 1.0, f"delivers {product_cfm:g} CFM, a good match for {required_cfm:g} CFM with {oversize:.0%} headroom"
    # Linear fall-off between 30% and 200% oversize.
    fraction = max(0.0, 1 - (oversize - IDEAL_OVERSIZE) / (MAX_OVERSIZE - IDEAL_OVERSIZE))
    return fraction, f"delivers {product_cfm:g} CFM, {oversize:.0%} more than needed (larger than necessary)"


def score_pressure(product: dict, req: Requirement):
    """Returns (fraction 0 or 1, explanation)."""
    rated = product["pressureBar"]
    if req.category == "VACUUM_PUMP":
        # Lower absolute pressure = deeper vacuum.
        ok = rated <= req.pressure_bar
        text = f"reaches {rated * 1000:g} mbar absolute (need {req.pressure_bar * 1000:g} mbar or better)"
    else:
        ok = rated >= req.pressure_bar
        text = f"is rated for {rated:g} bar (need {req.pressure_bar:g} bar)"
    return (1.0 if ok else 0.0), text


def score_phase(product_phase: str, site_phase: str):
    if site_phase == "SINGLE" and product_phase == "THREE":
        return 0.0, "needs a three-phase supply, but the site has single-phase"
    return 1.0, f"runs on {'single' if product_phase == 'SINGLE' else 'three'}-phase power, which the site has"


def score_application(applications: str, wanted: str):
    tags = [t.strip().lower() for t in applications.split(",") if t.strip()]
    wanted = wanted.strip().lower()
    if wanted in tags:
        return 1.0, f"is rated for {wanted} applications"
    if "general" in tags or wanted == "general":
        return 0.5, f"is general purpose, not specifically rated for {wanted}"
    return 0.0, f"is not intended for {wanted} applications"


def score_product(product: dict, req: Requirement) -> ScoredProduct:
    airflow, airflow_text = score_airflow(product["airflowCfm"], req.airflow_cfm)
    pressure, pressure_text = score_pressure(product, req)
    phase, phase_text = score_phase(product["phase"], req.phase)
    application, application_text = score_application(product["applications"], req.application)

    parts = {"airflow": airflow, "pressure": pressure, "phase": phase, "application": application}
    breakdown = {name: round(fraction * WEIGHTS[name], 1) for name, fraction in parts.items()}
    total = round(sum(breakdown.values()), 1)

    reasons, warnings = [], []
    for fraction, text in [(airflow, airflow_text), (pressure, pressure_text), (phase, phase_text), (application, application_text)]:
        (reasons if fraction >= 0.75 else warnings).append(text)

    return ScoredProduct(
        product=product,
        score=total,
        breakdown=breakdown,
        meets_hard_requirements=pressure == 1.0 and phase == 1.0,
        reasons=reasons,
        warnings=warnings,
    )


def explain(item: ScoredProduct) -> str:
    """One readable paragraph for the customer."""
    name = f"{item.product['name']} ({item.product['modelName']})"
    text = f"{name} scores {item.score:g}/100."
    if item.reasons:
        text += " It " + "; it ".join(item.reasons) + "."
    if item.warnings:
        text += " Note: it " + "; it ".join(item.warnings) + "."
    if not item.meets_hard_requirements:
        text += " It does not meet a hard requirement, so it is shown only because no better option exists."
    return text


def recommend(products: list, req: Requirement, top_n: int = 3) -> list:
    """Scores products of the requested category and returns the best `top_n`."""
    candidates = [p for p in products if p["category"] == req.category]
    scored = [score_product(p, req) for p in candidates]
    # Products that meet the hard requirements always rank first, then by score.
    scored.sort(key=lambda s: (s.meets_hard_requirements, s.score), reverse=True)
    return scored[:top_n]

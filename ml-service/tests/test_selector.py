from fastapi.testclient import TestClient

from app.main import app
from app.selector.scoring import Requirement, recommend, score_airflow, score_application, score_phase

client = TestClient(app)


def product(id, model, cfm, bar, phase="THREE", apps="general", category="AIR_COMPRESSOR"):
    return {
        "id": id, "modelName": model, "name": f"Model {model}", "category": category, "type": "SCREW",
        "airflowCfm": cfm, "pressureBar": bar, "powerKw": 5, "phase": phase, "applications": apps, "price": 1000,
    }


CATALOG = [
    product(1, "SMALL", 10, 10, phase="SINGLE", apps="general,medical"),
    product(2, "MID", 60, 8, apps="textile,packaging,general"),
    product(3, "OILFREE", 70, 8, apps="food,pharma"),
    product(4, "BIG", 200, 10, apps="automotive,general"),
    product(5, "LOWP", 65, 6, apps="food"),
    product(6, "PUMP", 60, 0.002, category="VACUUM_PUMP", apps="packaging,food"),
]


def test_airflow_ideal_undersized_and_oversized():
    assert score_airflow(60, 55)[0] == 1.0          # 9% headroom: ideal
    assert 0.65 < score_airflow(45, 50)[0] < 0.75   # 10% short: loses 30%
    assert score_airflow(10, 50)[0] == 0.0          # far too small
    assert score_airflow(300, 50)[0] == 0.0         # 6x: far too big
    assert 0 < score_airflow(100, 50)[0] < 1        # 2x: partly penalised


def test_phase_and_application_rules():
    assert score_phase("THREE", "SINGLE")[0] == 0.0
    assert score_phase("SINGLE", "THREE")[0] == 1.0
    assert score_application("food,pharma", "pharma")[0] == 1.0
    assert score_application("general", "pharma")[0] == 0.5
    assert score_application("automotive", "pharma")[0] == 0.0


def test_food_plant_gets_the_oil_free_machine_first():
    req = Requirement("AIR_COMPRESSOR", airflow_cfm=60, pressure_bar=7.5, phase="THREE", application="food")
    top = recommend(CATALOG, req)
    assert top[0].product["modelName"] == "OILFREE"
    assert top[0].score == 100
    assert len(top) == 3


def test_hard_requirements_rank_below_passing_products():
    # LOWP is great on airflow and application but can't reach 7.5 bar,
    # so it ranks below every machine that can, even ones with a lower score.
    from app.selector.scoring import score_product
    req = Requirement("AIR_COMPRESSOR", airflow_cfm=65, pressure_bar=7.5, phase="THREE", application="food")
    lowp = score_product(CATALOG[4], req)
    big = score_product(CATALOG[3], req)
    assert lowp.meets_hard_requirements is False
    assert lowp.score > big.score
    ranked = [t.product["modelName"] for t in recommend(CATALOG, req, top_n=10)]
    assert ranked[-1] == "LOWP"


def test_single_phase_site_only_gets_three_phase_machines_as_last_resort():
    req = Requirement("AIR_COMPRESSOR", airflow_cfm=9, pressure_bar=8, phase="SINGLE", application="medical")
    top = recommend(CATALOG, req)
    assert top[0].product["modelName"] == "SMALL"
    assert top[0].meets_hard_requirements
    assert all(not t.meets_hard_requirements for t in top[1:])


def test_vacuum_pumps_are_scored_separately():
    req = Requirement("VACUUM_PUMP", airflow_cfm=55, pressure_bar=0.01, phase="THREE", application="packaging")
    top = recommend(CATALOG, req)
    assert [t.product["modelName"] for t in top] == ["PUMP"]
    assert top[0].meets_hard_requirements


def test_api_returns_scores_breakdown_and_explanations():
    res = client.post("/select-products", json={
        "requirements": {"category": "AIR_COMPRESSOR", "airflowCfm": 60, "pressureBar": 7.5, "phase": "THREE", "application": "food"},
        "products": CATALOG,
    })
    assert res.status_code == 200
    body = res.json()
    first = body["results"][0]
    assert first["rank"] == 1
    assert set(first["breakdown"]) == {"airflow", "pressure", "phase", "application"}
    assert sum(first["breakdown"].values()) == first["score"]
    assert "scores 100/100" in first["explanation"]


def test_api_validates_input():
    res = client.post("/select-products", json={
        "requirements": {"airflowCfm": -1, "pressureBar": 7, "phase": "TWO", "application": "food"},
        "products": [],
    })
    assert res.status_code == 422

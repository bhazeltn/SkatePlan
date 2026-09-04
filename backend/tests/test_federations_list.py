"""GET /api/federations list endpoint tests (country resolution + sorting)."""
from app.seeds.seed_federations import seed_federations


def test_list_federations_resolves_country_and_sorts(client):
    seed_federations()
    resp = client.get("/api/federations")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body) >= 78  # 78 member federations (+ ISU baseline)

    by_code = {f["code"]: f for f in body}
    assert by_code["PHI"]["country"] == "Philippines"
    assert by_code["CAN"]["country"] == "Canada"
    for f in body:
        assert {"id", "name", "code", "country"} <= set(f)

    # Sorted alphabetically by country, then federation name.
    keys = [(f["country"].lower(), f["name"].lower()) for f in body]
    assert keys == sorted(keys)

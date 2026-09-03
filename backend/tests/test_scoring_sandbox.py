"""Stateless scoring sandbox endpoint tests (Sprint 2)."""


def _payload():
    # Two elements. 3Lz with a full 9-judge panel; 2A with an explicit GOE.
    return {
        "elements": [
            {
                "element_code": "3Lz",
                "panel_goe": [-1, 0, 1, 2, 2, 3, 3, 4, 5],
                "is_second_half_bonus": False,
                "element_bonus": 1.0,
            },
            {
                "element_code": "2A",
                "goe": 0.50,
                "is_second_half_bonus": True,
                "element_bonus": 2.0,
            },
        ],
        "pcs_marks": [20.00],
        "segment_bonus": 0.5,
        "deductions": 1.0,
    }


def test_scoring_calculate_itemized_and_tss(client):
    resp = client.post("/api/scoring/calculate", json=_payload())
    assert resp.status_code == 200, resp.text
    body = resp.json()

    items = body["elements"]
    # 3Lz: base 5.90, trimmed-mean scaled GOE = 1.26 -> scored 5.90 + 1.26
    assert items[0]["scored_base"] == 5.90
    assert items[0]["goe"] == 1.26
    # 2A: base 3.30, second-half -> 3.63, GOE 0.50
    assert items[1]["scored_base"] == 3.63
    assert items[1]["goe"] == 0.50

    # TES = (5.90 + 1.26) + (3.63 + 0.50) = 7.16 + 4.13 = 11.29
    assert body["tes"] == 11.29
    assert body["pcs"] == 20.00
    assert body["deductions"] == 1.0
    # Total bonus = 1.0 + 2.0 + 0.5 = 3.5
    assert body["total_bonus"] == 3.5
    # TSS = TES + PCS - Deductions + Total_Bonus = 11.29 + 20.00 - 1.0 + 3.5 = 33.79
    assert body["tss"] == 33.79
    assert body["tss"] == round(
        body["tes"] + body["pcs"] - body["deductions"] + body["total_bonus"], 2
    )


def test_scoring_calculate_element_bonus_override(client):
    payload = _payload()
    payload["elements"][0]["element_bonus"] = 5.0  # override
    resp = client.post("/api/scoring/calculate", json=payload)
    assert resp.status_code == 200, resp.text
    # Total bonus now 5.0 + 2.0 + 0.5 = 7.5 ; TSS shifts by +4.0 -> 37.79
    body = resp.json()
    assert body["total_bonus"] == 7.5
    assert body["tss"] == 37.79

"""Scale of Values seeding + admin upsert upload tests."""
import io

from sqlalchemy import func, select

from app.models.enums import SystemRole
from app.models.scoring import ScaleOfValues


def _ensure_seeded():
    from app.seeds.seed_sov import seed_scale_of_values
    seed_scale_of_values()


def _token(client, make_user, email, role):
    make_user(email, password="Pw123456!", role=role)
    r = client.post("/api/auth/login", json={"email": email, "password": "Pw123456!"})
    return r.json()["access_token"]


def test_sov_has_exactly_402_singles_rows(db):
    _ensure_seeded()
    count = db.scalar(select(func.count()).select_from(ScaleOfValues))
    assert count == 402


def test_sov_key_lookups_have_full_values(db):
    _ensure_seeded()
    for abbr in ("3Lz", "2A", "FLSp2"):
        row = db.get(ScaleOfValues, abbr)
        assert row is not None, abbr
        assert row.base_value is not None
        for col in (
            "goe_minus_5", "goe_minus_4", "goe_minus_3", "goe_minus_2", "goe_minus_1",
            "goe_plus_1", "goe_plus_2", "goe_plus_3", "goe_plus_4", "goe_plus_5",
        ):
            assert getattr(row, col) is not None, f"{abbr}.{col}"


def _csv_bytes(base_value: str) -> bytes:
    header = (
        "Element_Name,Abbreviation,BASE,GOE_-5,GOE_-4,GOE_-3,GOE_-2,GOE_-1,"
        "GOE_+1,GOE_+2,GOE_+3,GOE_+4,GOE_+5\n"
    )
    row = f"1T,1T,{base_value},-0.20,-0.16,-0.12,-0.08,-0.04,0.04,0.08,0.12,0.16,0.20\n"
    return (header + row).encode()


def test_admin_sov_upload_upserts(client, make_user, db):
    _ensure_seeded()
    token = _token(client, make_user, "admin@ex.com", SystemRole.admin)
    files = {"file": ("sov.csv", io.BytesIO(_csv_bytes("9.99")), "text/csv")}
    resp = client.post(
        "/api/admin/sov/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert resp.status_code == 200, resp.text
    db.expire_all()
    row = db.get(ScaleOfValues, "1T")
    assert float(row.base_value) == 9.99
    # upsert must NOT change the row count
    assert db.scalar(select(func.count()).select_from(ScaleOfValues)) == 402


def test_admin_sov_upload_forbidden_for_non_admin(client, make_user):
    _ensure_seeded()
    token = _token(client, make_user, "coachx@ex.com", SystemRole.coach)
    files = {"file": ("sov.csv", io.BytesIO(_csv_bytes("1.00")), "text/csv")}
    resp = client.post(
        "/api/admin/sov/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert resp.status_code == 403, resp.text

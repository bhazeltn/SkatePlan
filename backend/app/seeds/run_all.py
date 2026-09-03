"""Run all deterministic seeders in dependency order.

Usage:  python -m app.seeds.run_all
"""
from app.seeds.seed_federations import seed_federations
from app.seeds.seed_levels import seed_levels
from app.seeds.seed_sov import seed_scale_of_values


def run_all() -> dict:
    """Seed SoV, federations (must precede levels), then streams + levels."""
    sov = seed_scale_of_values()
    feds = seed_federations()
    levels = seed_levels()
    return {"scale_of_values": sov, "federations": feds, "levels": levels}


if __name__ == "__main__":
    summary = run_all()
    print("Seed summary:")
    for key, value in summary.items():
        print(f"  {key}: {value}")

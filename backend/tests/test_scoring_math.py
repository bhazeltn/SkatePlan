"""Pure deterministic scoring-service math tests (Sprint 2).

All expected numbers are documented and exact (2-decimal where scored).
No rule verification is exercised — only arithmetic against the SOV table.
"""
import pytest

from app.services.scoring import (
    apply_second_half,
    calculate_program_tss,
    calculate_trimmed_mean_goe,
    parse_combination_elements,
    trimmed_mean,
)


def test_combination_base_value_sums_exactly(db):
    # 3Lz (5.90) + 3T (4.20) == 10.10
    assert float(parse_combination_elements("3Lz+3T", db)) == 10.10


def test_combination_ignores_sequence_markers(db):
    # Sequence markers must be parsed without error and contribute 0 base value.
    assert float(parse_combination_elements("3Lz+SEQ+3T", db)) == 10.10
    assert float(parse_combination_elements("2A+COMBO", db)) == 3.30


def test_second_half_multiplier():
    # base 3.30 with second-half flag => 3.30 * 1.10 = 3.63
    assert float(apply_second_half(3.30, True)) == 3.63
    assert float(apply_second_half(3.30, False)) == 3.30


def test_trimmed_mean_drops_one_min_one_max():
    judges = [-1, 0, 1, 2, 2, 3, 3, 4, 5]
    # drop -1 and 5 -> [0,1,2,2,3,3,4] sum 15 / 7 = 2.142857...
    assert trimmed_mean(judges) == pytest.approx(15 / 7)


def test_scaled_trimmed_mean_goe_against_sov():
    # 3Lz: goe_plus_5 = 2.95 -> positive step = 2.95/5 = 0.59
    # scaled GOE = (15/7) * 0.59 = 1.264285... -> 1.26
    judges = [-1, 0, 1, 2, 2, 3, 3, 4, 5]
    result = calculate_trimmed_mean_goe(5.90, judges, -2.95, 2.95)
    assert result == 1.26


def test_negative_trimmed_mean_uses_negative_step():
    # judges average negative -> use negative step |goe_minus_5|/5.
    # 3Lz goe_minus_5 = -2.95 -> neg step 0.59. mean of [-4,-3,-3,-2,-2,-1,0] = -15/7
    judges = [-5, -4, -3, -3, -2, -2, -1, 0, 1]
    result = calculate_trimmed_mean_goe(5.90, judges, -2.95, 2.95)
    assert result == -1.26


def test_full_tss_identity_itemized():
    elements = [
        {"element_code": "3Lz", "base_value": 5.90, "goe": 1.26,
         "is_second_half_bonus": False, "element_bonus": 1.0},
        {"element_code": "2A", "base_value": 3.30, "goe": 0.50,
         "is_second_half_bonus": True, "element_bonus": 2.0},
    ]
    result = calculate_program_tss(
        elements_data=elements,
        pcs_data=[20.00],
        deductions=1.0,
        segment_bonus=0.5,
    )
    # 3Lz: 5.90 + 1.26 = 7.16 ; 2A second-half: 3.63 + 0.50 = 4.13
    assert result["tes"] == 11.29
    assert result["pcs"] == 20.00
    assert result["deductions"] == 1.0
    # Total bonus = element bonuses (1.0 + 2.0) + segment bonus 0.5 = 3.5
    assert result["total_bonus"] == 3.5
    # TSS = TES + PCS - Deductions + Total_Bonus = 11.29 + 20.00 - 1.0 + 3.5
    assert result["tss"] == 33.79
    # itemized per-element breakdown present
    items = result["elements"]
    assert items[0]["scored_base"] == 5.90 and items[0]["goe"] == 1.26
    assert items[1]["scored_base"] == 3.63
    assert result["tss"] == round(
        result["tes"] + result["pcs"] - result["deductions"] + result["total_bonus"], 2
    )

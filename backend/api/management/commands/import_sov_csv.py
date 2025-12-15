import csv
import json
import re
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import SkatingElement


class Command(BaseCommand):
    help = "Generates SOV fixture from CSV files including GOE scales"

    def handle(self, *args, **options):
        # Define paths
        data_dir = os.path.join(settings.BASE_DIR, "data")

        # 1. Clear existing elements to prevent duplicates/stale data
        self.stdout.write("Clearing existing elements...")
        SkatingElement.objects.all().delete()

        self.count = 0

        # 2. Process Files
        self.process_file(
            os.path.join(data_dir, "solo dance.csv"),
            discipline="Solo Dance",
            has_category=True,
        )

        self.process_file(
            os.path.join(data_dir, "ice dance.csv"),
            discipline="Ice Dance",
            has_category=True,
        )

        self.process_file(
            os.path.join(data_dir, "synchro.csv"),
            discipline="Synchro",
            has_category=False,  # Synchro CSV didn't have Category col, so we infer
        )

        # 4. Process Pairs & Singles (Special Logic for shared elements)
        self.process_pairs_singles(os.path.join(data_dir, "Pairs and Singles.csv"))

        self.stdout.write(
            self.style.SUCCESS(f"Successfully imported {self.count} elements.")
        )

    def process_file(self, filepath, discipline, has_category=False):
        if not os.path.exists(filepath):
            self.stderr.write(f"Skipping missing file: {filepath}")
            return

        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.create_element(row, discipline, has_category)

    def process_pairs_singles(self, filepath):
        if not os.path.exists(filepath):
            return

        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                code = row.get("Abbreviation", "").strip()
                if not code:
                    continue

                # Infer Category based on PAIRS logic first (superset of singles)
                cat = self.infer_category(code, "Pairs")

                # Logic: Jumps/Spins/Steps go to BOTH. Lifts/Throws/Twists go to Pairs.
                disciplines = []
                if cat in ["Jump", "Spin", "Step", "Choreo"]:
                    disciplines = ["Singles", "Pairs"]
                elif cat in ["Lift", "Throw", "Twist", "Death Spiral", "Pair", "Pivot"]:
                    disciplines = ["Pairs"]
                else:
                    # Default fallback
                    disciplines = ["Singles"]

                for d in disciplines:
                    self.create_element(row, d, has_category=False, force_category=cat)

    def create_element(self, row, discipline, has_category=False, force_category=None):
        code = row.get("Abbreviation", "").strip()
        name = row.get("Element_Name", "").strip()
        base_str = row.get("BASE", "0")

        if not code or code.lower() == "nan":
            return

        try:
            base_val = float(base_str)
        except ValueError:
            return

        # Determine Category
        if force_category:
            category = force_category
        elif has_category and row.get("Category"):
            category = row.get("Category").strip()
        else:
            category = self.infer_category(code, discipline)

        # --- STANDARD CHECK (Clean Elements Only) ---
        is_bad_variation = False

        # 1. Universal Bad Flags (<, <<, e, !, V)
        if any(x in code for x in ["<", "e", "!", "V"]):
            is_bad_variation = True

        # 2. 'q' Check (Context Sensitive)
        # 'q' stands for "Quarter" in jumps, but is part of standard codes like StSq, ChSq, SqTw.
        # Logic: Only flag 'q' as an error if it's a Jump (starts with a digit: 1Tq, 3Aq).
        if "q" in code and re.match(r"^\d", code):
            is_bad_variation = True

        is_standard = not is_bad_variation

        # --- EXTRACT GOE SCALE ---
        goe_scale = {}
        for i in range(-5, 6):
            if i == 0:
                continue
            col_name = f"GOE_{'+' if i > 0 else ''}{i}"
            val = row.get(col_name)
            if val:
                try:
                    goe_scale[str(i)] = float(val)
                except ValueError:
                    goe_scale[str(i)] = 0.0

        SkatingElement.objects.create(
            abbreviation=code,
            element_name=name,
            discipline_type=discipline,
            category=category,
            base_value=base_val,
            goe_scale=goe_scale,
            is_active=True,
            is_standard=is_standard,
        )
        self.count += 1

    def infer_category(self, code, discipline):
        code = str(code).upper().strip()

        # --- SINGLES & PAIRS LOGIC ---
        if discipline in ["Singles", "Pairs"]:
            # 1. Check Specific Pairs Elements FIRST
            if "TH" in code:
                return "Throw"  # e.g. 3LzTh
            if "TW" in code:
                return "Twist"  # e.g. 3Tw4
            if "LI" in code:
                return "Lift"  # e.g. 5ALi4
            if "DS" in code:
                return "Death Spiral"
            if "PI" in code:
                return "Pivot"  # e.g. PiF

            # 2. Then check generic types
            if "SP" in code:
                return "Spin"
            if "ST" in code:
                return "Step"
            if "CH" in code:
                return "Choreo"

            # 3. Finally, Regex for Jumps (1T, 2A)
            # Must start with digit, not be throw/twist
            if re.match(r"^\d[A-Z]", code):
                return "Jump"

        # --- SYNCHRO LOGIC ---
        if discipline == "Synchro":
            if "I" in code and len(code) < 5:
                return "Intersection"
            if "L" in code:
                return "Line"
            if "B" in code:
                return "Block"
            if "W" in code:
                return "Wheel"
            if "C" in code:
                return "Circle"
            if "ME" in code:
                return "Move"
            if "NH" in code:
                return "No Hold"
            if "TW" in code:
                return "Twizzle"
            if "TR" in code:
                return "Traveling"
            if "PA" in code:
                return "Pair"
            if "SYSP" in code:
                return "Spin"

        return "Other"

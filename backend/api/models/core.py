from django.db import models


class Federation(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, blank=True, null=True)
    flag_emoji = models.CharField(max_length=10, blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


class SkatingElement(models.Model):
    class ElementCategory(models.TextChoices):
        SINGLES = "SINGLES", "Singles"
        PAIRS = "PAIRS", "Pairs"
        ICE_DANCE = "ICE_DANCE", "Ice Dance"
        SYNCHRO = "SYNCHRO", "Synchro"

    class DisciplineType(models.TextChoices):
        JUMP = "JUMP", "Jump"
        SPIN = "SPIN", "Spin"
        SPIN_COMBINATION = "SPIN COMBINATION", "Spin Combination"
        STEP_SEQUENCE = "STEP SEQUENCE", "Step Sequence"
        CHOREOGRAPHIC_ELEMENT = "CHOREOGRAPHIC ELEMENT", "Choreographic Element"
        THROW_JUMP = "THROW JUMP", "Throw Jump"
        TWIST_LIFT = "TWIST LIFT", "Twist Lift"
        PAIR_SPIN = "PAIR SPIN", "Pair Spin"
        PAIR_SPIN_COMBINATION = "PAIR SPIN COMBINATION", "Pair Spin Combination"
        PAIR_LIFT = "PAIR LIFT", "Pair Lift"
        DEATH_SPIRAL = "DEATH SPIRAL", "Death Spiral"
        PAIR_ELEMENT = "PAIR ELEMENT", "Pair Element"
        PATTERN_DANCE = "PATTERN DANCE", "Pattern Dance"
        PATTERN_DANCE_ELEMENT = "PATTERN DANCE ELEMENT", "Pattern Dance Element"
        DANCE_STEP = "DANCE STEP", "Dance Step"
        DANCE_SPIN = "DANCE SPIN", "Dance Spin"
        DANCE_LIFT = "DANCE LIFT", "Dance Lift"
        DANCE_TWIZZLE = "DANCE TWIZZLE", "Dance Twizzle"
        DANCE_STEP_TURN = "DANCE STEP/TURN", "Dance Step/Turn"
        DANCE_EDGE_ELEMENT = "DANCE EDGE ELEMENT", "Dance Edge Element"
        CHOREOGRAPHIC = "CHOREOGRAPHIC", "Choreographic"
        SYNCHRO_ARTISTIC = "SYNCHRO ARTISTIC", "Synchro Artistic"
        SYNCHRO_CREATIVE = "SYNCHRO CREATIVE", "Synchro Creative"
        SYNCHRO_LIFT = "SYNCHRO LIFT", "Synchro Lift"
        SYNCHRO_INTERSECTION = "SYNCHRO INTERSECTION", "Synchro Intersection"
        SYNCHRO_FORMATION = "SYNCHRO FORMATION", "Synchro Formation"
        SYNCHRO_PIVOTING = "SYNCHRO PIVOTING", "Synchro Pivoting"
        SYNCHRO_SPIN = "SYNCHRO SPIN", "Synchro Spin"
        SYNCHRO_TWIZZLE = "SYNCHRO TWIZZLE", "Synchro Twizzle"
        SYNCHRO_MIXED = "SYNCHRO", "Synchro Mixed"
        OTHER = "OTHER", "Other"

    id = models.AutoField(primary_key=True)
    element_name = models.CharField(max_length=100)
    abbreviation = models.CharField(max_length=20, unique=True)
    discipline_type = models.CharField(
        max_length=50, choices=DisciplineType.choices, default=DisciplineType.OTHER
    )
    element_category = models.CharField(
        max_length=20, choices=ElementCategory.choices, default=ElementCategory.SINGLES
    )

    def __str__(self):
        return f"{self.element_name} ({self.abbreviation})"

    class Meta:
        ordering = ["element_category", "discipline_type", "element_name"]

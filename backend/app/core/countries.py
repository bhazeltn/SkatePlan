"""ISO 3166-1 alpha-2 -> display country name map.

Generated once from the ``pycountry`` dataset for the ISO codes present in the
federation seed data, with a few friendlier short names applied. Kept as a
static map so country resolution stays deterministic and has no runtime
third-party dependency.
"""

_ISO2_COUNTRY: dict[str, str] = {
    "ad": "Andorra",
    "ae": "United Arab Emirates",
    "am": "Armenia",
    "ar": "Argentina",
    "at": "Austria",
    "au": "Australia",
    "az": "Azerbaijan",
    "ba": "Bosnia and Herzegovina",
    "be": "Belgium",
    "bg": "Bulgaria",
    "br": "Brazil",
    "by": "Belarus",
    "ca": "Canada",
    "ch": "Switzerland",
    "cl": "Chile",
    "cn": "China",
    "cy": "Cyprus",
    "cz": "Czechia",
    "de": "Germany",
    "dk": "Denmark",
    "ec": "Ecuador",
    "ee": "Estonia",
    "eg": "Egypt",
    "es": "Spain",
    "fi": "Finland",
    "fr": "France",
    "gb": "United Kingdom",
    "ge": "Georgia",
    "gr": "Greece",
    "hk": "Hong Kong",
    "hr": "Croatia",
    "hu": "Hungary",
    "id": "Indonesia",
    "ie": "Ireland",
    "il": "Israel",
    "in": "India",
    "is": "Iceland",
    "it": "Italy",
    "jp": "Japan",
    "kg": "Kyrgyzstan",
    "kp": "North Korea",
    "kr": "South Korea",
    "kw": "Kuwait",
    "kz": "Kazakhstan",
    "li": "Liechtenstein",
    "lt": "Lithuania",
    "lu": "Luxembourg",
    "lv": "Latvia",
    "ma": "Morocco",
    "mc": "Monaco",
    "md": "Moldova",
    "mk": "North Macedonia",
    "mn": "Mongolia",
    "mx": "Mexico",
    "my": "Malaysia",
    "nl": "Netherlands",
    "no": "Norway",
    "nz": "New Zealand",
    "pe": "Peru",
    "ph": "Philippines",
    "pl": "Poland",
    "pt": "Portugal",
    "ro": "Romania",
    "rs": "Serbia",
    "ru": "Russia",
    "se": "Sweden",
    "sg": "Singapore",
    "si": "Slovenia",
    "sk": "Slovakia",
    "th": "Thailand",
    "tm": "Turkmenistan",
    "tr": "Türkiye",
    "tw": "Taiwan",
    "ua": "Ukraine",
    "us": "United States",
    "uz": "Uzbekistan",
    "vn": "Vietnam",
    "za": "South Africa",
}


def country_name(iso_code: str | None) -> str:
    """Resolve a display country name from an ISO alpha-2 code.

    Falls back to the upper-cased code when unknown, or an empty string when
    no code is provided.
    """
    if not iso_code:
        return ""
    code = iso_code.strip().lower()
    return _ISO2_COUNTRY.get(code, code.upper())

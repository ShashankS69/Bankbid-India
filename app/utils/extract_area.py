import re

# Matches sq ft: "1200 sq ft", "1,200 sqft", "1200 sq. ft."
SQFT_PATTERN = re.compile(
    r'(\d[\d,]{1,6}(?:\.\d+)?)\s*(?:sq\.?\s*\.?\s*ft\.?|sqft|square\s*feet)',
    re.IGNORECASE
)

# Matches sq m: "1839.48 Sq.m", "150 sqm", "150 square meters"
SQM_PATTERN = re.compile(
    r'(\d[\d,]{1,6}(?:\.\d+)?)\s*(?:sq\.?\s*\.?\s*m\.?|sqm|square\s*met(?:er|re)s?)',
    re.IGNORECASE
)

SQM_TO_SQFT = 10.7639


def extract_area_sqft(text: str | None) -> float | None:
    """
    Best-effort extraction of a square footage figure from free-text
    property descriptions. Checks for sq ft first, then sq m (converted
    to sq ft). Returns None when no confident match is found — expected
    for the majority of listings, since most sources don't publish
    structured area data.
    """
    if not text:
        return None

    match = SQFT_PATTERN.search(text)
    if match:
        try:
            value = float(match.group(1).replace(",", ""))
        except ValueError:
            return None
        return value if 50 <= value <= 200000 else None

    match = SQM_PATTERN.search(text)
    if match:
        try:
            value_sqm = float(match.group(1).replace(",", ""))
        except ValueError:
            return None
        value_sqft = round(value_sqm * SQM_TO_SQFT, 1)
        return value_sqft if 50 <= value_sqft <= 200000 else None

    return None
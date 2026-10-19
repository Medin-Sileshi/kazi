"""Rule-based job post parser for Telegram channel messages."""

from __future__ import annotations

import hashlib
import re
from datetime import datetime
from typing import Any

CATEGORIES = [
    "engineering",
    "design",
    "product",
    "marketing",
    "sales",
    "ops",
    "finance",
    "internship",
    "other",
]

# Longer phrases first; short tokens (ui, ux, go, pm) use word boundaries.
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "engineering": [
        "software engineer",
        "full-stack",
        "fullstack",
        "backend",
        "frontend",
        "devops",
        "developer",
        "engineer",
        "programmer",
        "sre",
        "android",
        "ios developer",
        "it support",
        "network",
        "system admin",
    ],
    "design": [
        "product design",
        "graphic design",
        "ui/ux",
        "ui designer",
        "ux designer",
        "designer",
        "figma",
    ],
    "product": ["product manager", "product owner", "product lead"],
    "marketing": [
        "digital marketing",
        "content marketer",
        "social media",
        "marketing",
        "seo",
        "growth",
        "brand manager",
    ],
    "sales": [
        "sales representative",
        "account executive",
        "business development",
        "sales officer",
        "sales ",
        " sales",
        "bdm",
    ],
    "ops": [
        "operations",
        "supply chain",
        "logistics",
        "administrative",
        "administration",
        "office management",
        "hr management",
        "human resource",
        "customer service",
    ],
    "finance": [
        "accountant",
        "accounting",
        "finance officer",
        "finance",
        "controller",
        "cfo",
        "treasury",
        "audit",
    ],
    "internship": ["internship", "intern ", " graduate", "trainee", "graduate trainee"],
}

SKILL_PATTERNS = [
    "react native",
    "next.js",
    "nextjs",
    "typescript",
    "javascript",
    "python",
    "django",
    "flask",
    "nodejs",
    "node.js",
    "kotlin",
    "swift",
    "golang",
    "laravel",
    "rails",
    "docker",
    "kubernetes",
    "postgres",
    "mongodb",
    "graphql",
    "flutter",
    "tailwind",
    "react",
    "java",
    "rust",
    "php",
    "ruby",
    "aws",
    "gcp",
    "azure",
    "figma",
    "sql",
    "redis",
]

# Employment/meta hashtags — never treat as skills
SKILL_BLOCKLIST = {
    "fulltime",
    "full-time",
    "parttime",
    "part-time",
    "permanent",
    "contract",
    "remote",
    "onsite",
    "hybrid",
    "vacancy",
    "job",
    "hiring",
    "ethiopia",
    "addis",
    "addisababa",
}

URL_RE = re.compile(r"https?://\S+", re.I)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.\w+")
HASHTAG_RE = re.compile(r"#(\w+)")
COMPANY_RE = re.compile(
    r"(?:company|organization|org)\s*[:\-]\s*(.+)",
    re.I,
)
LOCATION_RE = re.compile(
    r"(?:location|place of work|based in|office)\s*[:\-]\s*(.+)",
    re.I,
)

# Channel promo / non-job noise
JUNK_PATTERNS = [
    r"hiring for various positions",
    r"click through their latest postings",
    r"join our telegram channel for more",
    r"join our (telegram )?channel",
    r"subscribe (to|our)",
    r"follow (us|our channel)",
    r"click here to apply:\s*.*link",
    r"explore the opportunities",
    r"new .+ jobs in ethiopia\s*$",
    r"^https?://t\.me/\w+\s*$",
]

JUNK_RE = [re.compile(p, re.I | re.S) for p in JUNK_PATTERNS]

STRONG_SIGNALS = [
    r"\bcompany\s*:",
    r"\bplace of work\s*:",
    r"\bdeadline\b",
    r"\bjob summary\b",
    r"\bjob description\b",
    r"\bjob purpose\b",
    r"\bresponsibilities\b",
    r"\brequirements\b",
    r"\bvacancy\b",
    r"\bemployment\s*:",
    r"#fulltime\b",
    r"#permanent\b",
    r"gizejobs\.com/",
    r"how to apply",
    r"apply now",
    r"የስራ ማስታወቂያ",
    r"ቅጥር",
]


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _strip_urls(text: str) -> str:
    return _norm(URL_RE.sub(" ", text))


def _kw_in(text: str, kw: str) -> bool:
    kw = kw.lower()
    if len(kw.strip()) <= 3:
        return bool(re.search(rf"(?<!\w){re.escape(kw.strip())}(?!\w)", text, re.I))
    return kw in text


def is_junk(text: str) -> bool:
    """Reject channel promos, teasers, and caption-only noise."""
    raw = (text or "").strip()
    if not raw:
        return True

    stripped = _strip_urls(raw)
    lower = raw.lower()

    # Bare channel link + optional short Amharic date caption
    if re.fullmatch(r"https?://t\.me/[\w+/]+", raw.strip(), re.I):
        return True
    if stripped.startswith("https://t.me/") or stripped.startswith("t.me/"):
        if len(stripped) < 80:
            return True

    # Title/body is only a telegram link line
    first = (raw.splitlines()[0] if raw.splitlines() else "").strip()
    if re.fullmatch(r"https?://t\.me/\S+", first, re.I) and len(stripped) < 100:
        return True

    for rx in JUNK_RE:
        if rx.search(raw):
            return True

    # EthioJobs-style teaser: org name + boilerplate, no real role body
    if "is hiring for various positions" in lower:
        return True
    if "click here to apply" in lower and "join our telegram" in lower:
        return True

    # Very short after removing URLs / emoji-only promos
    alpha = re.sub(r"[^\w\sሀ-፼]", "", stripped, flags=re.UNICODE)
    if len(alpha) < 50:
        return True

    return False


def is_likely_job(text: str) -> bool:
    if is_junk(text):
        return False

    t = _norm(text)
    if len(t) < 60:
        return False

    lower = t.lower()
    strong = sum(1 for p in STRONG_SIGNALS if re.search(p, lower))
    if strong >= 1:
        return True

    weak = [
        "hiring",
        "we are looking",
        "we're looking",
        "looking for",
        "vacancy",
        "position",
        "apply",
        "full-time",
        "full time",
        "internship",
        "ስራ",
    ]
    hits = sum(1 for s in weak if s in lower)
    # Need a bit more than a single vague "job"/"apply" mention
    if hits >= 2 and len(t) >= 120:
        return True
    return False


def extract_title(text: str) -> str:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        return "Untitled role"
    # Skip pure URL / emoji-only lead lines
    for line in lines[:5]:
        cleaned = re.sub(r"[*_`]", "", line)
        cleaned = re.sub(r"^#+\s*", "", cleaned)
        cleaned = re.sub(r"^[\W_]+", "", cleaned, flags=re.UNICODE).strip()
        if not cleaned or cleaned.lower().startswith("http"):
            continue
        if re.fullmatch(r"https?://\S+", cleaned, re.I):
            continue
        return cleaned[:500]
    first = re.sub(r"[*_`]", "", lines[0])
    return first[:500] or "Untitled role"


def extract_categories(text: str) -> list[str]:
    lower = text.lower()
    found: list[str] = []
    for cat, kws in CATEGORY_KEYWORDS.items():
        if any(_kw_in(lower, kw) for kw in kws):
            found.append(cat)
    return found[:3] or ["other"]


def extract_skills(text: str) -> list[str]:
    lower = text.lower()
    skills: list[str] = []
    for s in SKILL_PATTERNS:
        if _kw_in(lower, s):
            skills.append(s)
    for tag in HASHTAG_RE.findall(text):
        t = tag.lower()
        if len(t) > 2 and t not in SKILL_BLOCKLIST and t not in skills:
            # Only keep hashtags that look technical / role-related, not employment
            if t in {p.replace(".", "").replace(" ", "") for p in SKILL_PATTERNS}:
                skills.append(t)
    return skills[:15]


def extract_tags(text: str, market: str) -> list[str]:
    lower = text.lower()
    tags: list[str] = []
    if any(x in lower for x in ["remote", "work from home", "wfh", "distributed"]):
        tags.append("remote")
    if "hybrid" in lower:
        tags.append("hybrid")
    if any(x in lower for x in ["onsite", "on-site", "in office", "office based"]):
        tags.append("onsite")
    if any(x in lower for x in ["ethiopia", "addis", "አዲስ", "ኢትዮጵያ"]):
        tags.append("ethiopia")
    if market == "ethiopia" and "ethiopia" not in tags:
        tags.append("ethiopia")
    if market == "remote":
        if "remote" not in tags:
            tags.append("remote")
        tags.append("global")
    elif market == "both":
        tags.append("global")
    return tags


def extract_company(text: str) -> str | None:
    for line in text.splitlines():
        m = COMPANY_RE.search(line)
        if m:
            return _norm(m.group(1))[:500]
    # "Vacancy at X" / "at X P.L.C"
    m = re.search(r"vacancy at\s+(.+)", text, re.I)
    if m:
        return _norm(m.group(1).split("\n")[0])[:500]
    return None


def extract_location(text: str) -> str | None:
    for line in text.splitlines():
        m = LOCATION_RE.search(line)
        if m:
            return _norm(m.group(1))[:500]
    lower = text.lower()
    if "addis" in lower:
        return "Addis Ababa, Ethiopia"
    if "ethiopia" in lower:
        return "Ethiopia"
    if "remote" in lower:
        return "Remote"
    return None


def extract_apply_url(text: str) -> str | None:
    urls = URL_RE.findall(text)
    for u in urls:
        cleaned = u.rstrip(").,]>\"'")
        # Prefer external apply boards over channel self-links
        if re.search(r"t\.me/(geezjobs|gizejobs|ethiojobs)", cleaned, re.I):
            continue
        if "t.me/" in cleaned.lower() and "gizejobs.com" not in cleaned.lower():
            continue
        return cleaned
    for u in urls:
        cleaned = u.rstrip(").,]>\"'")
        if "gizejobs.com" in cleaned.lower() or "ethiojobs" in cleaned.lower():
            return cleaned
    email = EMAIL_RE.search(text)
    if email:
        return f"mailto:{email.group(0)}"
    return None


def dedupe_hash(title: str, company: str | None, posted_at: datetime) -> str:
    day = posted_at.strftime("%Y-%m-%d")
    base = f"{_norm(title).lower()}|{(company or '').lower()}|{day}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()[:64]


def parse_message(
    text: str,
    *,
    username: str,
    message_id: int,
    posted_at: datetime,
    market: str,
) -> dict[str, Any] | None:
    if not is_likely_job(text):
        return None

    title = extract_title(text)
    # Reject if title collapsed to a URL
    if title.lower().startswith("http") or "t.me/" in title.lower() and len(title) < 40:
        return None

    company = extract_company(text)
    location = extract_location(text)
    tags = extract_tags(text, market)
    remote = "remote" in tags
    categories = extract_categories(text)
    skills = extract_skills(text)
    apply_url = extract_apply_url(text)
    source_url = f"https://t.me/{username}/{message_id}"

    return {
        "title": title,
        "company": company,
        "location": location,
        "description": text.strip(),
        "categories": categories,
        "skills": skills,
        "tags": tags,
        "remote": remote,
        "employment_type": None,
        "salary_text": None,
        "apply_url": apply_url,
        "source_url": source_url,
        "posted_at": posted_at,
        "dedupe_hash": dedupe_hash(title, company, posted_at),
    }

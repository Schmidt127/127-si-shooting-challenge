from __future__ import annotations

import os
from dataclasses import dataclass


def _env_flag(name: str) -> bool:
    return (os.getenv(name) or "").strip().lower() in {"1", "true", "yes", "on"}


PROD_BASE = "appn84sqPw03zEbTT"
TABLE = "Submission Assets"


@dataclass(frozen=True)
class UploadConfig:
    airtable_base_id: str
    airtable_token: str
    s3_bucket: str
    aws_region: str
    environment: str
    allow_route_keys: frozenset[str]
    season_slug: str
    challenge_slug: str
    athlete_slug_override: str | None
    upload_webhook_secret: str | None
    viewer_presign_ttl_seconds: int = 900
    viewer_base_url: str | None = None
    allow_season_slug_fallback: bool = False

    @classmethod
    def from_env(cls) -> UploadConfig:
        environment = (os.getenv("ENVIRONMENT") or "PRODUCTION").strip().upper()
        if environment not in {"PROD", "PRODUCTION"}:
            raise ValueError("ENVIRONMENT must be PROD or PRODUCTION")
        base = (os.getenv("AIRTABLE_BASE_ID") or "").strip()
        if not base:
            base = PROD_BASE
        if base != PROD_BASE:
            raise ValueError(
                f"Production-only configuration requires AIRTABLE_BASE_ID={PROD_BASE}; got {base}"
            )

        token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
        if not token:
            raise ValueError("Missing AIRTABLE_TOKEN / AIRTABLE_API_TOKEN")

        allow_raw = os.getenv("ALLOW_ROUTE_KEYS", "video_feedback,homework_completion")
        allow_route_keys = frozenset(k.strip() for k in allow_raw.split(",") if k.strip())

        ttl_raw = (os.getenv("VIEWER_PRESIGN_TTL_SECONDS") or "900").strip()
        try:
            viewer_ttl = int(ttl_raw)
        except ValueError as exc:
            raise ValueError("VIEWER_PRESIGN_TTL_SECONDS must be an integer") from exc
        if viewer_ttl < 60 or viewer_ttl > 3600:
            raise ValueError("VIEWER_PRESIGN_TTL_SECONDS must be between 60 and 3600")

        viewer_base = (os.getenv("VIEWER_BASE_URL") or "").strip() or None

        return cls(
            airtable_base_id=base,
            airtable_token=token,
            s3_bucket=os.getenv("S3_BUCKET", "shooting-challenge-assets"),
            aws_region=os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-2",
            environment=os.getenv("ENVIRONMENT", "Production"),
            allow_route_keys=allow_route_keys,
            season_slug=(os.getenv("SEASON_SLUG") or "").strip(),
            challenge_slug=os.getenv("CHALLENGE_SLUG", "shooting-challenge"),
            athlete_slug_override=os.getenv("ATHLETE_SLUG_OVERRIDE") or None,
            upload_webhook_secret=os.getenv("UPLOAD_WEBHOOK_SECRET") or None,
            viewer_presign_ttl_seconds=viewer_ttl,
            viewer_base_url=viewer_base,
            allow_season_slug_fallback=_env_flag("ALLOW_SEASON_SLUG_FALLBACK"),
        )

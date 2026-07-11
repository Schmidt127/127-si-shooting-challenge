from __future__ import annotations

import os
from dataclasses import dataclass


DEV_BASE = "appTetnuCZlCZdTCT"
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

    @classmethod
    def from_env(cls) -> UploadConfig:
        environment = (os.getenv("ENVIRONMENT") or "DEV").strip().upper()
        base = (os.getenv("AIRTABLE_BASE_ID") or "").strip()
        if not base:
            base = PROD_BASE if environment == "PROD" else DEV_BASE

        if environment == "PROD":
            if base != PROD_BASE:
                raise ValueError(
                    f"ENVIRONMENT=PROD requires AIRTABLE_BASE_ID={PROD_BASE}; got {base}"
                )
        else:
            if base == PROD_BASE:
                raise ValueError(
                    f"Production base {PROD_BASE} is blocked when ENVIRONMENT={environment}"
                )
            if base != DEV_BASE:
                raise ValueError(f"Only DEV base {DEV_BASE} allowed; got {base}")

        token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
        if not token:
            raise ValueError("Missing AIRTABLE_TOKEN / AIRTABLE_API_TOKEN")

        allow_raw = os.getenv("ALLOW_ROUTE_KEYS", "video_feedback,homework_completion")
        allow_route_keys = frozenset(k.strip() for k in allow_raw.split(",") if k.strip())

        return cls(
            airtable_base_id=base,
            airtable_token=token,
            s3_bucket=os.getenv("S3_BUCKET", "shooting-challenge-assets"),
            aws_region=os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-2",
            environment=os.getenv("ENVIRONMENT", "DEV"),
            allow_route_keys=allow_route_keys,
            season_slug=os.getenv("SEASON_SLUG", "2026-2027"),
            challenge_slug=os.getenv("CHALLENGE_SLUG", "shooting-challenge"),
            athlete_slug_override=os.getenv("ATHLETE_SLUG_OVERRIDE") or None,
            upload_webhook_secret=os.getenv("UPLOAD_WEBHOOK_SECRET") or None,
        )

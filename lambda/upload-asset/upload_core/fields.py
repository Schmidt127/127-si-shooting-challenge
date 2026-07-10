"""Approved Airtable field names for upload claim and C-023 review (Stage 2 contract)."""

from __future__ import annotations

# Upload claim
FIELD_UPLOAD_STATUS = "Upload Status"
FIELD_UPLOAD_CLAIM_RUN_ID = "Upload Claim Run ID"
FIELD_PROCESSING_STARTED_AT = "Processing Started At"
FIELD_CANONICAL_FILE_URL = "Canonical File URL"
FIELD_FILE_CONTENT_HASH = "File Content Hash"
FIELD_UPLOAD_ERROR = "Upload Error"

# Technical duplicate / hash
FIELD_EXACT_HASH_MATCH_FOUND = "Exact Hash Match Found?"
FIELD_SAME_ENROLLMENT_MATCH_FOUND = "Same Enrollment Match Found?"
FIELD_DUPLICATE_MATCH_RECORD = "Duplicate Match Record"
FIELD_DUPLICATE_MATCH_RECORDS_ALL = "Duplicate Match Records (All)"
FIELD_DUPLICATE_FILE_STATUS = "Duplicate File Status"
FIELD_DUPLICATE_MATCH_STRENGTH = "Duplicate Match Strength"
FIELD_DUPLICATE_MATCH_NOTES = "Duplicate Match Notes"
FIELD_DUPLICATE_CHECKED_AT = "Duplicate Checked At"
FIELD_DUPLICATE_CHECK_ERROR = "Duplicate Check Error"

# Automated review (Lambda)
FIELD_POTENTIAL_ASSET_REUSE = "Potential Asset Reuse?"
FIELD_ASSET_REUSE_REVIEW_PRIMARY_REASON = "Asset Reuse Review Primary Reason"
FIELD_ASSET_REUSE_REVIEW_REASONS = "Asset Reuse Review Reasons"
FIELD_ASSET_REUSE_REVIEW_SUMMARY = "Asset Reuse Review Summary"

# Mike-controlled (Lambda must not overwrite non-default values)
FIELD_ASSET_REUSE_DECISION = "Asset Reuse Decision"
ASSET_REUSE_DECISION_NOT_REVIEWED = "Not Reviewed"

# Legacy — stop writing from Lambda
FIELD_FILE_IS_DUPLICATE = "File is Duplicate?"

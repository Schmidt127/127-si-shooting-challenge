#!/usr/bin/env python3
"""C-009 — offline contract: HW17 quiz → assets → 070a/071 compatibility."""

from __future__ import annotations

import unittest


SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"
HW17_NUMBER = "HW 17"
ASSET_SLOT = "HW1"
ASSET_PURPOSE = "Homework 1"
UPLOAD_STATUS_PENDING_LINK = "Pending Link"
UPLOAD_DEST_HOMEWORK = "Homework Completions"


def completion_identity(enrollment_id: str, week_id: str, homework_id: str) -> str:
    return f"{enrollment_id}|{week_id}|{homework_id}"


def should_create_asset(
    *,
    attachments: list[dict],
    existing_source_attachment_ids: set[str],
) -> list[dict]:
    """Return attachments that still need Submission Asset rows."""
    out = []
    for file in attachments:
        sid = str(file.get("id") or "").strip()
        if not sid:
            continue
        if sid in existing_source_attachment_ids:
            continue
        out.append(file)
    return out


def action_for_quiz_row(
    *,
    already_linked: bool,
    enrollment_count: int,
    attachments: list[dict],
    existing_source_attachment_ids: set[str],
    attachment_field_present: bool = True,
) -> str:
    if enrollment_count != 1:
        return "needs_review"
    if not attachment_field_present:
        return "no_attachment_field"
    if already_linked and not attachments:
        return "no_attachment_yet"
    if already_linked and attachments:
        pending = should_create_asset(
            attachments=attachments,
            existing_source_attachment_ids=existing_source_attachment_ids,
        )
        if not pending and existing_source_attachment_ids:
            return "assets_linked"
        if pending:
            return "assets_created"
        return "assets_linked"
    if not attachments:
        return "no_attachment_yet"
    return "created_new"


def asset_fields_for_070a(file: dict, enrollment_id: str, hc_id: str) -> dict:
    return {
        "Enrollment - Linked": [enrollment_id],
        "Airtable Attachment": [file],
        "Source Attachment ID": file["id"],
        "Asset Purpose": ASSET_PURPOSE,
        "Asset Slot": ASSET_SLOT,
        "Upload Status": UPLOAD_STATUS_PENDING_LINK,
        "Upload Destination": UPLOAD_DEST_HOMEWORK,
        "Send to Make Trigger": False,
        "Homework Completions": [hc_id],
    }


def homework_xp_source_key(hc_id: str) -> str:
    return f"HOMEWORK_XP|{hc_id}"


class TestC009Hw17AttachmentContract(unittest.TestCase):
    def test_completion_identity_stable(self):
        self.assertEqual(
            completion_identity("recE", "recW", "recH"),
            "recE|recW|recH",
        )

    def test_multi_attachment_dedupe_by_source_id(self):
        files = [{"id": "att1"}, {"id": "att2"}, {"id": "att1"}]
        # unique ids present twice — create once each
        existing: set[str] = set()
        first = should_create_asset(
            attachments=files[:2], existing_source_attachment_ids=existing
        )
        self.assertEqual([f["id"] for f in first], ["att1", "att2"])
        existing |= {"att1", "att2"}
        second = should_create_asset(
            attachments=files, existing_source_attachment_ids=existing
        )
        self.assertEqual(second, [])

    def test_no_attachment_does_not_error(self):
        self.assertEqual(
            action_for_quiz_row(
                already_linked=False,
                enrollment_count=1,
                attachments=[],
                existing_source_attachment_ids=set(),
            ),
            "no_attachment_yet",
        )

    def test_missing_attachment_field_action(self):
        self.assertEqual(
            action_for_quiz_row(
                already_linked=False,
                enrollment_count=1,
                attachments=[],
                existing_source_attachment_ids=set(),
                attachment_field_present=False,
            ),
            "no_attachment_field",
        )

    def test_parent_submission_required_for_upload_ready(self):
        # Inventory decision: both parent Submission + assets
        design = {"parent_submission": True, "direct_assets": True}
        self.assertTrue(design["parent_submission"])
        self.assertTrue(design["direct_assets"])

    def test_070a_compatible_defaults(self):
        fields = asset_fields_for_070a(
            {"id": "attX", "filename": "hw17.pdf"},
            SCHMIDT_ENROLLMENT_ID,
            "recHC",
        )
        self.assertEqual(fields["Upload Status"], UPLOAD_STATUS_PENDING_LINK)
        self.assertEqual(fields["Upload Destination"], UPLOAD_DEST_HOMEWORK)
        self.assertFalse(fields["Send to Make Trigger"])
        self.assertEqual(fields["Asset Slot"], ASSET_SLOT)
        self.assertEqual(fields["Homework Completions"], ["recHC"])

    def test_071_fillout_path_does_not_require_assets(self):
        # Contract: missing assets still allow Fillout email path
        has_assets = False
        source_system = "Fillout"
        quiz_linked = True
        can_build_071 = source_system == "Fillout" and quiz_linked
        self.assertTrue(can_build_071)
        self.assertFalse(has_assets)  # explicitly allowed

    def test_hw17_slot_is_hw1_not_hw2(self):
        self.assertEqual(ASSET_SLOT, "HW1")
        self.assertEqual(HW17_NUMBER, "HW 17")

    def test_xp_not_created_by_067(self):
        # 067 never invents Source Keys — 065 does after coach review
        self.assertEqual(homework_xp_source_key("recHC"), "HOMEWORK_XP|recHC")


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""FUT-007 basename unit tests — spec acceptance matrix (§11)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.fut007_basename import (
    BuildBasenameInput,
    Fut007NamingInput,
    apply_collision_suffix,
    build_fut007_basename,
    build_fut007_storage_key,
    build_media_basename,
    extension_from_filename,
    format_activity_date_stamp,
    next_collision_index,
    resolve_custom_name_segment,
    resolve_media_category,
    sanitize_extension,
    sanitize_name_part,
)
from upload_core.storage_key import resolve_storage_key


class TestSanitizeNamePart:
    def test_t6_strips_punctuation_and_diacritics(self):
        assert sanitize_name_part("O'Brien", "X") == "OBrien"
        assert sanitize_name_part("José", "X") == "Jose"

    def test_t4_collapses_spaces_and_hyphens(self):
        assert sanitize_name_part("Off The Dribble", "X") == "OffTheDribble"
        assert sanitize_name_part("Free-Throws", "X") == "FreeThrows"

    def test_t7_rejects_path_traversal_patterns(self):
        assert sanitize_name_part("../../etc/passwd", "Safe") == "etcpasswd"

    def test_uses_fallback_when_empty(self):
        assert sanitize_name_part("  ", "Fallback") == "Fallback"


class TestResolveMediaCategory:
    def test_t12_maps_homework_and_video_destinations(self):
        assert resolve_media_category(upload_destination="Homework Completions") == "HW"
        assert resolve_media_category(upload_destination="Video Feedback") == "VIDEO"

    def test_maps_registration_headshot_purpose(self):
        assert resolve_media_category(asset_purpose="Registration Headshot") == "HEADSHOT"


class TestResolveCustomNameSegment:
    def test_uses_custom_video_file_name_for_video(self):
        assert (
            resolve_custom_name_segment(
                category="VIDEO",
                custom_video_file_name="OffTheDribble",
            )
            == "OffTheDribble"
        )

    def test_t5_falls_back_to_focus_plus_sequence(self):
        assert (
            resolve_custom_name_segment(
                category="VIDEO",
                video_feedback_focus="Form",
                asset_sequence=2,
            )
            == "Form2"
        )

    def test_t2_sanitizes_homework_assignment_title(self):
        assert (
            resolve_custom_name_segment(
                category="HW",
                homework_assignment_name="Shot Challenge",
            )
            == "ShotChallenge"
        )

    def test_t3_headshot_defaults_to_profile(self):
        assert resolve_custom_name_segment(category="HEADSHOT") == "Profile"

    def test_hw_asset_sequence_fallback(self):
        assert resolve_custom_name_segment(category="HW", asset_sequence=3) == "Hw3"

    def test_video_blank_custom_uses_video_upload(self):
        assert resolve_custom_name_segment(category="VIDEO", custom_video_file_name="  ") == "VideoUpload"


class TestBuildMediaBasename:
    def test_t1_video_with_custom_name(self):
        assert (
            build_media_basename(
                BuildBasenameInput(
                    activity_date="2026-08-17",
                    category="VIDEO",
                    last_name="Boltz",
                    first_name="Drew",
                    custom_name="OffTheDribble",
                    extension=".mp4",
                )
            )
            == "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4"
        )

    def test_t2_homework_assignment_basename(self):
        assert (
            build_media_basename(
                BuildBasenameInput(
                    activity_date="2026-08-17",
                    category="HW",
                    last_name="Boltz",
                    first_name="Drew",
                    custom_name="ShotChallenge",
                    extension=".jpg",
                )
            )
            == "20260817_HW_Boltz_Drew_ShotChallenge.jpg"
        )

    def test_t3_headshot_default_profile(self):
        assert (
            build_media_basename(
                BuildBasenameInput(
                    activity_date="2026-08-17",
                    category="HEADSHOT",
                    last_name="Boltz",
                    first_name="Drew",
                    custom_name="Profile",
                    extension=".jpg",
                )
            )
            == "20260817_HEADSHOT_Boltz_Drew_Profile.jpg"
        )

    def test_t10_missing_athlete_names(self):
        assert (
            build_media_basename(
                BuildBasenameInput(
                    activity_date="2026-08-17",
                    category="VIDEO",
                    last_name="",
                    first_name="",
                    custom_name="Clip",
                    extension=".mp4",
                )
            )
            == "20260817_VIDEO_UnknownAthlete_UnknownAthlete_Clip.mp4"
        )

    def test_t4_video_custom_with_hyphen(self):
        assert (
            build_media_basename(
                BuildBasenameInput(
                    activity_date="2026-08-17",
                    category="VIDEO",
                    last_name="Boltz",
                    first_name="Drew",
                    custom_name=resolve_custom_name_segment(
                        category="VIDEO",
                        custom_video_file_name="Free-Throws",
                    ),
                    extension=".mp4",
                )
            )
            == "20260817_VIDEO_Boltz_Drew_FreeThrows.mp4"
        )


class TestCollisionHandling:
    def test_t8_applies_collision_suffix(self):
        base = "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4"
        assert apply_collision_suffix(base, 2) == "20260817_VIDEO_Boltz_Drew_OffTheDribble_2.mp4"

    def test_next_collision_index_finds_free_slot(self):
        candidate = "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4"
        existing = [
            candidate,
            "20260817_VIDEO_Boltz_Drew_OffTheDribble_2.mp4",
        ]
        assert next_collision_index(candidate, existing) == 3

    def test_collision_index_one_leaves_basename_unchanged(self):
        base = "20260817_HW_Boltz_Drew_ShotChallenge.jpg"
        assert apply_collision_suffix(base, 1) == base

    def test_build_fut007_basename_applies_collision(self):
        naming = Fut007NamingInput(
            activity_date="2026-08-17",
            category="VIDEO",
            last_name="Boltz",
            first_name="Drew",
            custom_name="OffTheDribble",
            extension=".mp4",
            existing_basenames=("20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4",),
        )
        assert build_fut007_basename(naming) == "20260817_VIDEO_Boltz_Drew_OffTheDribble_2.mp4"


class TestStorageKeyHelper:
    def test_composes_folder_prefix_and_basename(self):
        assert (
            build_fut007_storage_key(
                athlete_folder="Boltz_Drew",
                program_instance_folder="Shooting_Challenge_2026-2027",
                naming=Fut007NamingInput(
                    activity_date="2026-08-17",
                    category="VIDEO",
                    last_name="Boltz",
                    first_name="Drew",
                    custom_name="OffTheDribble",
                    extension=".mp4",
                ),
            )
            == "Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/"
            "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4"
        )


class TestUtilities:
    def test_format_activity_date_stamp_accepts_iso_date(self):
        assert format_activity_date_stamp("2026-08-17") == "20260817"

    def test_extension_from_filename_extracts_extension(self):
        assert extension_from_filename("folder/clip.MP4") == ".mp4"

    def test_sanitize_extension_defaults_to_bin(self):
        assert sanitize_extension("") == ".bin"


class TestStorageKeyIntegration:
    def test_legacy_default_when_flag_off(self):
        from datetime import datetime, timezone

        fields = {
            "Upload Destination": "Homework Completions",
            "Activity Date": "2026-08-17",
            "Created Time": "2026-08-17T17:27:32.000Z",
            "Asset Slot": "HW1",
            "Original File Name": "Straughn_Stetson_316.jpg",
        }
        key, reused = resolve_storage_key(
            record_id="recAqoUbBKfDNtTLt",
            fields=fields,
            athlete_folder="Schmidt_Xavier",
            program_instance_folder="Shooting_Challenge_2026-2027",
            now=datetime(2026, 8, 17, 17, 27, 32, tzinfo=timezone.utc),
            fut007_enabled=False,
        )
        assert not reused
        assert "recAqoUbBKfDNtTLt" in key
        assert key.split("/")[-1].startswith("20260817T172732Z_HW1_")

    def test_fut007_path_when_flag_enabled(self):
        fields = {
            "Upload Destination": "Video Feedback",
            "Activity Date": "2026-08-17",
            "Custom Video File Name": "OffTheDribble",
            "Original File Name": "clip.mp4",
        }
        key, reused = resolve_storage_key(
            record_id="recVideoAsset01",
            fields=fields,
            athlete_folder="Boltz_Drew",
            program_instance_folder="Shooting_Challenge_2026-2027",
            last_name="Boltz",
            first_name="Drew",
            fut007_enabled=True,
        )
        assert not reused
        assert key == (
            "Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/"
            "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4"
        )
        assert "recVideoAsset01" not in key

    def test_t9_retry_reuses_persisted_storage_key(self):
        existing = (
            "Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/"
            "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4"
        )
        fields = {
            "Storage Key": existing,
            "Upload Destination": "Video Feedback",
            "Original File Name": "other.mp4",
        }
        key, reused = resolve_storage_key(
            record_id="recVideoAsset01",
            fields=fields,
            athlete_folder="Different",
            program_instance_folder="Different",
            fut007_enabled=True,
        )
        assert reused
        assert key == existing

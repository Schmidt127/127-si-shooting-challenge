"""Shared C-013/C-023 upload logic for Lambda and local CLI."""

from upload_core.processor import UploadError, process_upload_asset

__all__ = ["UploadError", "process_upload_asset"]

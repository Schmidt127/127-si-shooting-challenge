from __future__ import annotations

from dataclasses import dataclass

from upload_core.util import select_name


@dataclass(frozen=True)
class UploadRoute:
    route_key: str
    upload_destination: str
    target_table: str
    automation_number: str
    target_link_field: str
    missing_link_action: str


ROUTE_VIDEO_FEEDBACK = UploadRoute(
    route_key="video_feedback",
    upload_destination="Video Feedback",
    target_table="Video Feedback",
    automation_number="070b",
    target_link_field="Video Feedback",
    missing_link_action="error_missing_video_feedback",
)

ROUTE_HOMEWORK_COMPLETION = UploadRoute(
    route_key="homework_completion",
    upload_destination="Homework Completions",
    target_table="Homework Completions",
    automation_number="070a",
    target_link_field="Homework Completions",
    missing_link_action="error_missing_homework_completion",
)

ROUTES_BY_KEY: dict[str, UploadRoute] = {
    ROUTE_VIDEO_FEEDBACK.route_key: ROUTE_VIDEO_FEEDBACK,
    ROUTE_HOMEWORK_COMPLETION.route_key: ROUTE_HOMEWORK_COMPLETION,
}

ROUTES_BY_DESTINATION: dict[str, UploadRoute] = {
    ROUTE_VIDEO_FEEDBACK.upload_destination: ROUTE_VIDEO_FEEDBACK,
    ROUTE_HOMEWORK_COMPLETION.upload_destination: ROUTE_HOMEWORK_COMPLETION,
}


def route_for_destination(destination: str | None) -> UploadRoute | None:
    return ROUTES_BY_DESTINATION.get(select_name(destination) or "")


def route_for_key(route_key: str) -> UploadRoute | None:
    return ROUTES_BY_KEY.get(str(route_key or "").strip())


def resolve_upload_route(*, fields: dict, route_key: str) -> UploadRoute:
    by_key = route_for_key(route_key)
    destination = select_name(fields.get("Upload Destination"))
    by_dest = route_for_destination(destination)
    if by_key and by_dest and by_key.route_key != by_dest.route_key:
        raise ValueError(
            f"routeKey {route_key!r} does not match Upload Destination {destination!r}"
        )
    return by_key or by_dest or ROUTE_VIDEO_FEEDBACK

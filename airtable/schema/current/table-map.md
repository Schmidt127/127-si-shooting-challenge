# Table Map — Shooting Challenge

**Last updated:** 2026-07-24  
**Authority:** PROD schema export `docs/foundation-reset/PROD-SCHEMA-EXPORT-2026-07-23.md`. Prefer dated snapshot over this hand map.

## Core tables

Config, Enrollments, Athletes, Weeks, Grade Bands, Program Instance - Synced, School - Synced, Submissions, Submission Assets, Homework Completions, Video Feedback, Final Reflection Quiz Submissions, XP Events, XP Reward Rules, Levels, Level Gate Rules, Achievements, Athlete Achievement Unlocks, Streak Occurrences, Shot Milestones, Weekly Athlete Summary, Target Goal Shots, Zoom Meetings, Tutorials, Tutorials & Assets, FBC Curriculum - SYNC, Awards, Award Recipients, Automations, Testing Scenarios.

## Relationships

```
Config -- Weeks
Enrollments -- Athletes / Grade Bands / Levels / Level Gate Rules
Enrollments -- Submissions -- Submission Assets -- Homework Completions | Video Feedback -- XP Events
Enrollments + Week -- Weekly Athlete Summary
Zoom Meetings.Attendees -- 101 XP only (117 never writes Attendees)
Zoom recording credit -- 117 ZOOM_CREDIT
```

Week key pattern: `2026-2027|Week 0` … Week 9 + Post-Challenge.

Out of scope: Team Shot Tracker inactivity alerts.

Related: `docs/next-wave/reliability-audit-2026-07-24/`

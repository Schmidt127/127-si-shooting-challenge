/*
Automation: 072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-21
Last GitHub Update: 2026-06-21

Purpose:
Builds the branded weekly parent/athlete summary email package on Weekly Athlete Summary.

Trigger:
Weekly Athlete Summary when Build Weekly Email Now? is checked.

Important Tables:
Weekly Athlete Summary, Enrollments, Weeks, Submissions, Homework Completions, XP Events, Video Feedback, Zoom Meetings, XP Reward Rules, FBC Curriculum - SYNC

Important Fields:
Build Weekly Email Now?, Weekly Email Ready?, Send to Make?, Weekly Email HTML, Weekly Email Subject, Weekly Email Recipients

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/************************************************************
 * 072 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Build Weekly Summary Email Package
 *
 * Version: v3.7
 * Date Written: 2026-05-19
 * Last Updated: 2026-06-21
 *
 * PURPOSE
 * - Runs from one Weekly Athlete Summary record.
 * - Builds the branded weekly parent/athlete summary email.
 * - Summarizes shooting, homework, Zoom attendance, video feedback,
 *   streaks, thresholds, XP buckets, and XP event detail.
 * - Writes the finished email package back to the Weekly Athlete Summary record.
 * - Does NOT send the email to Make.com or Gmail directly.
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package
 *
 * TRIGGER TABLE
 * - Weekly Athlete Summary
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED TRIGGER CONDITIONS
 * - Build Weekly Email Now? is checked
 * - Weekly Email Sent? is unchecked
 * - Enrollment is not empty
 * - Week is not empty
 *
 * OPTIONAL TRIGGER CONDITION
 * - Weekly Email Ready? is unchecked
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Weekly Athlete Summary record
 *
 * OPTIONAL INPUT VARIABLES
 * - sendModeInput = sendMode from the triggering Weekly Athlete Summary record
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Build Weekly Email Now? = unchecked
 * - Weekly Email Ready? = checked
 * - Weekly Email Sent? = unchecked
 * - Send to Make? = unchecked
 * - Weekly Email Sent At = cleared
 * - Weekly Email Error = cleared
 * - Weekly Email Subject = generated subject
 * - Weekly Email Recipients = parent/athlete email CSV
 * - Weekly Email HTML = generated branded HTML email
 * - Weekly Email Text = generated plain-text version
 * - Weekly Email Payload JSON = full payload/diagnostics JSON
 * - Weekly Email Week Label = generated week label
 * - Weekly Email Revision = script version
 * - Weekly Email Last Built At = current timestamp
 *
 * IMPORTANT NOTES
 * - This is NOT a Video Feedback trigger script.
 * - This is NOT the Make/Gmail send script.
 * - This script only prepares the weekly email package.
 * - This script must not send the email and must not arm the Make send automation.
 * - Send to Make? is left unchecked so staff can review the email HTML before manually arming send.
 * - A separate automation (074) sends the prepared package to Make/Gmail after Send to Make? is checked manually.
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: EASY-EDIT CONFIG
   ========================================================= */

const CONFIG = {
    scriptName: "072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package",
    version: "v3.7",
    dateWritten: "2026-05-19",
    lastUpdated: "2026-06-21",

    timeZone: "America/Denver",

    tables: {
        summary: "Weekly Athlete Summary",
        enrollments: "Enrollments",
        weeks: "Weeks",
        submissions: "Submissions",
        homework: "Homework Completions",
        xpEvents: "XP Events",
        videoFeedback: "Video Feedback",
        zoomMeetings: "Zoom Meetings",
        xpRules: "XP Reward Rules",
        curriculum: "FBC Curriculum - SYNC",
    },

    summaryFields: {
        enrollment: "Enrollment",
        week: "Week",
        submissions: "Submissions",
        homeworkLinks: "Homework Completions Link",
        xpEvents: "XP Events",
        weeklyXp: "XP Earned This Week",
        daysLogged: "Days Logged This Week",
        totalShots: "Total Shots This Week",
        totalMakes: "Total Makes This Week",
        homeworkAssignedCount: "Homework Assigned Count",
        homeworkSatisfactoryCount: "Homework Satisfactory Count",
        zoomSummary: "Zoom Meetings Summary",
        videoSummary: "Video Feedback Summary",
        weeklyGoalTarget: "Weekly Goal Shots Target",
        thresholdValue: "Threshold Value",
        levelNumber: "Level Number",
        homeworkDisplay: "Homework Display",

        buildNow: "Build Weekly Email Now?",
        sendMode: "sendMode",

        emailReady: "Weekly Email Ready?",
        emailSent: "Weekly Email Sent?",
        emailSentAt: "Weekly Email Sent At",
        emailError: "Weekly Email Error",
        emailRevision: "Weekly Email Revision",
        sendToMake: "Send to Make?",
        emailSubject: "Weekly Email Subject",
        emailRecipients: "Weekly Email Recipients",
        emailHtml: "Weekly Email HTML",
        emailText: "Weekly Email Text",
        emailPayloadJson: "Weekly Email Payload JSON",
        emailWeekLabel: "Weekly Email Week Label",
        emailLastBuiltAt: "Weekly Email Last Built At",
    },

    enrollmentFields: {
        athleteEmail: "Athlete Email - Cleaned",
        parentEmail: "Parent Email - Cleaned",
        fullName: "Full Athlete Name",
        fullNameBackward: "Full Athlete Name - Backward",
        gradeBand: "Grade Band",
    },

    levelDisplayCandidates: [
        "Level Name with Color (from Current Level)",
        "Current Level",
        "Level Status",
    ],

    weekFields: {
        name: "Week Name",
        start: "Start Date",
        end: "End Date",
        startKey: "Week Start Key",
        endKey: "Week End Key",
        curriculum: "FBC Curriculum - SYNC",
    },

    submissionFields: {
        activityDate: "Activity Date",
        activityDateKey: "Activity Date Key",
        enrollment: "Enrollment",
        week: "Week",
        countThis: "Count This Submission?",
        xpEvents: "XP Events",
        homeworkName1: "Homework Name 1",
        homeworkName2: "Homework Name 2",
    },

    submissionShotCandidates: [
        "Total Shots Counted",
        "Total Shots",
        "Total Shots Submitted",
        "Shots Submitted",
        "Shot Count",
        "Total Attempts",
    ],

    homeworkFields: {
        homework: "Homework",
        satisfactory: "Satisfactory?",
        xpTotal: "Total Homework XP Awarded",
        feedback1: "Feedback HW1",
        feedback2: "Feedback HW2",
        assetSlot: "Asset Slot",
    },

    xpFields: {
        enrollment: "Enrollment",
        week: "Week",
        submission: "Submission",
        videoFeedback: "Video Feedback",
        achievementUnlock: "Achievement Unlock",
        source: "XP Source",
        bucketKey: "XP Bucket",
        points: "XP Points",
        reason: "XP Reason Public",
        active: "Active?",
        sourceKey: "Source Key",
    },

    videoFields: {
        enrollment: "Enrollment",
        submission: "Submission",
        activityDateLkp: "Activity Date - Lkp",
        feedbackPosted: "Feedback Posted?",
        coachFeedback: "Coach Feedback",
        totalXp: "Total Video XP Awarded",
        baseXp: "Base XP Awarded",
        extraCreditXp: "Extra Credit XP Awarded",
        awardStatus: "Award Status",
        doNotAward: "Do Not Award XP?",
    },

    zoomFields: {
        week: "Week",
        attendees: "Attendees",
    },

    xpRuleFields: {
        nameCandidates: ["Reward Rule", "Rule Name", "Name"],
        ruleKey: "Rule Key",
        sourceLabel: "XP Source Label",
        xpAmount: "XP Amount",
        active: "Active?",
        gradeBand: "Grade Band",
        description: "Description",
    },

    curriculumFields: {
        assignmentFullName: "Assignment Full Name",
        assignmentTitle: "Assignment Title",
        assignmentNumber: "Assignment Number",
        order: "Order",
        published: "Published?",
        active: "Active?",
    },

    ruleKeys: {
        shootingBase: "SHOOTING_BASE",
        streakPrefix: "STREAK_",
        thresholdPrefix: "WEEKLY_THRESHOLD_",
    },

    defaults: {
        homeworkXpPossible: 35,
        zoomXpPossible: 35,
        videoXpPossible: 25,
    },

    branding: {
        brandName: "127 Sports Intensity",
        blue: "#0034B7",
        orange: "#FF8B00",
        bg: "#F2F2F2",
        text: "#262626",
        card: "#FFFFFF",
        border: "#D9DDE8",
        muted: "#5E667A",
        tableAlt: "#F8FAFF",
        width: "720px",
    },
};

/* =========================================================
   SECTION 4: GENERAL HELPERS
   ========================================================= */

function fieldExists(table, fieldName) {
    if (!table || !fieldName) return false;

    try {
        table.getField(fieldName);
        return true;
    } catch {
        return false;
    }
}

function existingFields(table, fieldNames) {
    return fieldNames.filter(fieldName => fieldExists(table, fieldName));
}

function getRaw(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return null;
    return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return "";
    return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, table, fieldName, fallback = 0) {
    const raw = getRaw(record, table, fieldName);

    if (typeof raw === "number" && Number.isFinite(raw)) {
        return raw;
    }

    const text = String(raw ?? "").replace(/,/g, "").trim();
    if (!text) return fallback;

    const n = Number(text);
    return Number.isFinite(n) ? n : fallback;
}

function getBooleanish(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (raw === true) return true;
    if (raw === false) return false;
    if (raw === 1) return true;
    if (raw === 0) return false;

    const text = String(raw ?? "").trim().toLowerCase();
    return ["1", "true", "yes", "checked", "y"].includes(text);
}

function getLinkedIds(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);
    if (!Array.isArray(raw)) return [];
    return raw.map(item => item?.id).filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
    return getLinkedIds(record, table, fieldName)[0] || "";
}

function firstExistingField(table, fieldNames) {
    for (const fieldName of fieldNames) {
        if (fieldExists(table, fieldName)) return fieldName;
    }

    return "";
}

function firstNonBlank(...values) {
    for (const value of values) {
        const text = String(value ?? "").trim();
        if (text) return text;
    }

    return "";
}

function normalizeText(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function compactKey(value) {
    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

function normalizeBucketKey(value) {
    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function roundWhole(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? String(Math.round(n)) : "0";
}

function formatXp(value) {
    const n = Number(value || 0);

    if (!Number.isFinite(n)) return "0 XP";
    if (Math.round(n) === n) return `${n} XP`;

    return `${Math.round(n * 100) / 100} XP`;
}

function formatXpFraction(earned, possible) {
    const e = Number(earned || 0);
    const p = Number(possible || 0);

    const cleanEarned = Number.isFinite(e) ? Math.round(e * 100) / 100 : 0;
    const cleanPossible = Number.isFinite(p) ? Math.round(p * 100) / 100 : 0;

    return `${cleanEarned}/${cleanPossible}`;
}

function uniqueEmails(emails) {
    return [...new Set(
        emails
            .map(email => String(email || "").trim().toLowerCase())
            .filter(Boolean)
    )];
}

function recordDisplay(record, table) {
    if (!record) return "";

    try {
        return getText(record, table, table.primaryField.name);
    } catch {
        return "";
    }
}

function sumNumbers(rows, fieldName) {
    return rows.reduce((sum, row) => sum + (Number(row[fieldName]) || 0), 0);
}

function setOutputSafe(name, value) {
    try {
        output.set(name, value);
    } catch {
        // Ignore output errors.
    }
}

function plainTextFromHtml(html) {
    return String(html || "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<li>/gi, "• ")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/* =========================================================
   SECTION 4B: SAFE DATE HELPERS
   ========================================================= */

function getFirstDisplayFromRaw(value) {
    if (Array.isArray(value)) {
        const first = value[0];

        if (first === null || first === undefined) return "";
        if (typeof first === "string") return first;
        if (typeof first === "number") return String(first);

        if (typeof first === "object") {
            return String(first.name || first.value || first.text || first.id || "").trim();
        }

        return String(first || "").trim();
    }

    if (value && typeof value === "object" && !(value instanceof Date)) {
        return String(value.name || value.value || value.text || value.id || "").trim();
    }

    return String(value ?? "").trim();
}

function isPlainDateString(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function parsePlainDateString(value) {
    const text = String(value || "").trim();

    if (!isPlainDateString(text)) return null;

    const [year, month, day] = text.split("-").map(Number);

    return {
        year,
        month,
        day,
        dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        dateObject: new Date(Date.UTC(year, month - 1, day, 12, 0, 0)),
    };
}

function formatDate(value) {
    const displayValue = getFirstDisplayFromRaw(value);
    if (!displayValue) return "";

    const plain = parsePlainDateString(displayValue);

    if (plain) {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: CONFIG.timeZone,
            month: "short",
            day: "numeric",
            year: "numeric",
        }).format(plain.dateObject);
    }

    const d = value instanceof Date ? value : new Date(displayValue);
    if (Number.isNaN(d.getTime())) return "";

    return new Intl.DateTimeFormat("en-US", {
        timeZone: CONFIG.timeZone,
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(d);
}

function formatDayLabel(value) {
    const displayValue = getFirstDisplayFromRaw(value);
    if (!displayValue) return "";

    const plain = parsePlainDateString(displayValue);

    if (plain) {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: CONFIG.timeZone,
            weekday: "short",
            month: "short",
            day: "numeric",
        }).format(plain.dateObject);
    }

    const d = value instanceof Date ? value : new Date(displayValue);
    if (Number.isNaN(d.getTime())) return displayValue;

    return new Intl.DateTimeFormat("en-US", {
        timeZone: CONFIG.timeZone,
        weekday: "short",
        month: "short",
        day: "numeric",
    }).format(d);
}

function toLocalDateKey(value) {
    const displayValue = getFirstDisplayFromRaw(value);
    if (!displayValue) return "";

    const plain = parsePlainDateString(displayValue);

    if (plain) {
        return plain.dateKey;
    }

    const d = value instanceof Date ? value : new Date(displayValue);
    if (Number.isNaN(d.getTime())) return "";

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: CONFIG.timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(d);

    const year = parts.find(p => p.type === "year")?.value || "";
    const month = parts.find(p => p.type === "month")?.value || "";
    const day = parts.find(p => p.type === "day")?.value || "";

    return `${year}-${month}-${day}`;
}

/* =========================================================
   SECTION 5: HTML HELPERS
   ========================================================= */

const BRAND = CONFIG.branding;

function renderBadge(label, value) {
    return `
        <div style="display:inline-block;background:#F7F9FC;border:1px solid ${BRAND.border};border-radius:999px;padding:6px 9px;margin:3px 5px 0 0;">
            <div style="font-size:8px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.3px;">${escapeHtml(label)}</div>
            <div style="font-size:11px;font-weight:700;color:${BRAND.text};">${escapeHtml(value)}</div>
        </div>
    `;
}

function renderCard(title, bodyHtml) {
    if (!bodyHtml || !String(bodyHtml).trim()) return "";

    return `
        <div style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:14px;padding:13px 15px;margin:0 0 12px 0;">
            <div style="font-size:14px;line-height:1.25;font-weight:800;color:${BRAND.orange};margin:0 0 8px 0;">
                ${escapeHtml(title)}
            </div>
            <div style="font-size:11px;line-height:1.35;color:${BRAND.text};">
                ${bodyHtml}
            </div>
        </div>
    `;
}

function renderCompactTable(headers, rows, emptyMessage) {
    if (!rows || rows.length === 0) {
        return `<div style="font-size:11px;color:${BRAND.muted};">${escapeHtml(emptyMessage || "No items to show.")}</div>`;
    }

    const headHtml = headers.map(h => `
        <th style="text-align:left;padding:6px 7px;border-bottom:1px solid ${BRAND.border};font-size:9px;font-weight:800;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.3px;white-space:nowrap;">
            ${escapeHtml(h)}
        </th>
    `).join("");

    const bodyHtml = rows.map((row, rowIndex) => {
        const bg = rowIndex % 2 === 0 ? "#FFFFFF" : BRAND.tableAlt;

        return `
            <tr style="background:${bg};">
                ${row.map((cell, index) => `
                    <td style="padding:6px 7px;border-bottom:1px solid #EEF1F6;font-size:10px;color:${index === row.length - 1 ? BRAND.blue : BRAND.text};${index === row.length - 1 ? "font-weight:700;" : ""}vertical-align:top;white-space:nowrap;">
                        ${escapeHtml(cell)}
                    </td>
                `).join("")}
            </tr>
        `;
    }).join("");

    return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
            <thead>
                <tr>${headHtml}</tr>
            </thead>
            <tbody>
                ${bodyHtml}
            </tbody>
        </table>
    `;
}

/* =========================================================
   SECTION 2: MAIN
   ========================================================= */

async function main() {
    /* =========================================================
       SECTION 2: INPUT
       ========================================================= */

    const cfg = input.config();
    const recordId = String(cfg.recordId || "").trim();
    const sendModeInput = String(cfg.sendModeInput || "").trim();

    if (!recordId) {
        throw new Error("Missing required input: recordId");
    }

    /* =========================================================
       SECTION 3: TABLES
       ========================================================= */

    const summaryTable = base.getTable(CONFIG.tables.summary);
    const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
    const weeksTable = base.getTable(CONFIG.tables.weeks);
    const submissionsTable = base.getTable(CONFIG.tables.submissions);
    const homeworkTable = base.getTable(CONFIG.tables.homework);
    const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
    const videoTable = base.getTable(CONFIG.tables.videoFeedback);
    const zoomTable = base.getTable(CONFIG.tables.zoomMeetings);
    const xpRulesTable = base.getTable(CONFIG.tables.xpRules);
    const curriculumTable = base.getTable(CONFIG.tables.curriculum);

    /* =========================================================
       SECTION 6: DETERMINE EXISTING FIELDS
       ========================================================= */

    const submissionShotsField = firstExistingField(
        submissionsTable,
        CONFIG.submissionShotCandidates
    );

    const enrollmentLevelField = firstExistingField(
        enrollmentsTable,
        CONFIG.levelDisplayCandidates
    );

    const ruleNameField = firstExistingField(
        xpRulesTable,
        CONFIG.xpRuleFields.nameCandidates
    );

    const summaryFieldsToLoad = existingFields(summaryTable, [
        CONFIG.summaryFields.enrollment,
        CONFIG.summaryFields.week,
        CONFIG.summaryFields.submissions,
        CONFIG.summaryFields.homeworkLinks,
        CONFIG.summaryFields.xpEvents,
        CONFIG.summaryFields.weeklyXp,
        CONFIG.summaryFields.daysLogged,
        CONFIG.summaryFields.totalShots,
        CONFIG.summaryFields.totalMakes,
        CONFIG.summaryFields.homeworkAssignedCount,
        CONFIG.summaryFields.homeworkSatisfactoryCount,
        CONFIG.summaryFields.zoomSummary,
        CONFIG.summaryFields.videoSummary,
        CONFIG.summaryFields.weeklyGoalTarget,
        CONFIG.summaryFields.thresholdValue,
        CONFIG.summaryFields.levelNumber,
        CONFIG.summaryFields.homeworkDisplay,
        CONFIG.summaryFields.buildNow,
        CONFIG.summaryFields.sendMode,
    ]);

    const enrollmentFieldsToLoad = existingFields(enrollmentsTable, [
        CONFIG.enrollmentFields.athleteEmail,
        CONFIG.enrollmentFields.parentEmail,
        CONFIG.enrollmentFields.fullName,
        CONFIG.enrollmentFields.fullNameBackward,
        CONFIG.enrollmentFields.gradeBand,
        enrollmentLevelField,
    ]);

    const weekFieldsToLoad = existingFields(weeksTable, [
        CONFIG.weekFields.name,
        CONFIG.weekFields.start,
        CONFIG.weekFields.end,
        CONFIG.weekFields.startKey,
        CONFIG.weekFields.endKey,
        CONFIG.weekFields.curriculum,
    ]);

    const submissionFieldsToLoad = existingFields(submissionsTable, [
        CONFIG.submissionFields.activityDate,
        CONFIG.submissionFields.activityDateKey,
        CONFIG.submissionFields.enrollment,
        CONFIG.submissionFields.week,
        CONFIG.submissionFields.countThis,
        CONFIG.submissionFields.xpEvents,
        CONFIG.submissionFields.homeworkName1,
        CONFIG.submissionFields.homeworkName2,
        submissionShotsField,
    ]);

    const homeworkFieldsToLoad = existingFields(homeworkTable, [
        CONFIG.homeworkFields.homework,
        CONFIG.homeworkFields.satisfactory,
        CONFIG.homeworkFields.xpTotal,
        CONFIG.homeworkFields.feedback1,
        CONFIG.homeworkFields.feedback2,
        CONFIG.homeworkFields.assetSlot,
    ]);

    const xpFieldsToLoad = existingFields(xpEventsTable, [
        CONFIG.xpFields.enrollment,
        CONFIG.xpFields.week,
        CONFIG.xpFields.submission,
        CONFIG.xpFields.videoFeedback,
        CONFIG.xpFields.achievementUnlock,
        CONFIG.xpFields.source,
        CONFIG.xpFields.bucketKey,
        CONFIG.xpFields.points,
        CONFIG.xpFields.reason,
        CONFIG.xpFields.active,
        CONFIG.xpFields.sourceKey,
    ]);

    const videoFieldsToLoad = existingFields(videoTable, [
        CONFIG.videoFields.enrollment,
        CONFIG.videoFields.submission,
        CONFIG.videoFields.activityDateLkp,
        CONFIG.videoFields.feedbackPosted,
        CONFIG.videoFields.coachFeedback,
        CONFIG.videoFields.totalXp,
        CONFIG.videoFields.baseXp,
        CONFIG.videoFields.extraCreditXp,
        CONFIG.videoFields.awardStatus,
        CONFIG.videoFields.doNotAward,
    ]);

    const zoomFieldsToLoad = existingFields(zoomTable, [
        CONFIG.zoomFields.week,
        CONFIG.zoomFields.attendees,
    ]);

    const xpRuleFieldsToLoad = existingFields(xpRulesTable, [
        ruleNameField,
        CONFIG.xpRuleFields.ruleKey,
        CONFIG.xpRuleFields.sourceLabel,
        CONFIG.xpRuleFields.xpAmount,
        CONFIG.xpRuleFields.active,
        CONFIG.xpRuleFields.gradeBand,
        CONFIG.xpRuleFields.description,
    ]);

    const curriculumFieldsToLoad = existingFields(curriculumTable, [
        CONFIG.curriculumFields.assignmentFullName,
        CONFIG.curriculumFields.assignmentTitle,
        CONFIG.curriculumFields.assignmentNumber,
        CONFIG.curriculumFields.order,
        CONFIG.curriculumFields.published,
        CONFIG.curriculumFields.active,
    ]);

    /* =========================================================
       SECTION 7: LOAD RECORDS
       ========================================================= */

    const summaryRecord = await summaryTable.selectRecordAsync(recordId, {
        fields: summaryFieldsToLoad,
    });

    if (!summaryRecord) {
        throw new Error(`Weekly Athlete Summary not found: ${recordId}`);
    }

    const enrollmentId = getFirstLinkedId(
        summaryRecord,
        summaryTable,
        CONFIG.summaryFields.enrollment
    );

    const weekId = getFirstLinkedId(
        summaryRecord,
        summaryTable,
        CONFIG.summaryFields.week
    );

    if (!enrollmentId) {
        throw new Error("Weekly Athlete Summary is missing Enrollment.");
    }

    if (!weekId) {
        throw new Error("Weekly Athlete Summary is missing Week.");
    }

    const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId, {
        fields: enrollmentFieldsToLoad,
    });

    const weekRecord = await weeksTable.selectRecordAsync(weekId, {
        fields: weekFieldsToLoad,
    });

    if (!enrollmentRecord) {
        throw new Error(`Enrollment not found: ${enrollmentId}`);
    }

    if (!weekRecord) {
        throw new Error(`Week not found: ${weekId}`);
    }

    const submissionsQuery = await submissionsTable.selectRecordsAsync({
        fields: submissionFieldsToLoad,
    });

    const homeworkQuery = await homeworkTable.selectRecordsAsync({
        fields: homeworkFieldsToLoad,
    });

    const xpEventsQuery = await xpEventsTable.selectRecordsAsync({
        fields: xpFieldsToLoad,
    });

    const videoQuery = await videoTable.selectRecordsAsync({
        fields: videoFieldsToLoad,
    });

    const zoomQuery = await zoomTable.selectRecordsAsync({
        fields: zoomFieldsToLoad,
    });

    const xpRulesQuery = await xpRulesTable.selectRecordsAsync({
        fields: xpRuleFieldsToLoad,
    });

    const curriculumQuery = await curriculumTable.selectRecordsAsync({
        fields: curriculumFieldsToLoad,
    });

    /* =========================================================
       SECTION 8: CORE RECORD VALUES
       ========================================================= */

    const linkedSubmissionIds = getLinkedIds(
        summaryRecord,
        summaryTable,
        CONFIG.summaryFields.submissions
    );

    const linkedHomeworkIds = getLinkedIds(
        summaryRecord,
        summaryTable,
        CONFIG.summaryFields.homeworkLinks
    );

    const linkedXpEventIds = getLinkedIds(
        summaryRecord,
        summaryTable,
        CONFIG.summaryFields.xpEvents
    );

    const linkedCurriculumIds = getLinkedIds(
        weekRecord,
        weeksTable,
        CONFIG.weekFields.curriculum
    );

    const athleteName = firstNonBlank(
        getText(enrollmentRecord, enrollmentsTable, CONFIG.enrollmentFields.fullName),
        getText(enrollmentRecord, enrollmentsTable, CONFIG.enrollmentFields.fullNameBackward),
        "Athlete"
    );

    const currentLevelText = firstNonBlank(
        enrollmentLevelField ? getText(enrollmentRecord, enrollmentsTable, enrollmentLevelField) : "",
        fieldExists(summaryTable, CONFIG.summaryFields.levelNumber)
            ? `Level ${getNumber(summaryRecord, summaryTable, CONFIG.summaryFields.levelNumber, 0)}`
            : "",
        "Not yet assigned"
    );

    const gradeBandText = getText(
        enrollmentRecord,
        enrollmentsTable,
        CONFIG.enrollmentFields.gradeBand
    );

    const athleteEmail = getText(
        enrollmentRecord,
        enrollmentsTable,
        CONFIG.enrollmentFields.athleteEmail
    );

    const parentEmail = getText(
        enrollmentRecord,
        enrollmentsTable,
        CONFIG.enrollmentFields.parentEmail
    );

    const recipientsCsv = uniqueEmails([parentEmail, athleteEmail]).join(",");

    const weekName = getText(weekRecord, weeksTable, CONFIG.weekFields.name);
    const weekStartRaw = getRaw(weekRecord, weeksTable, CONFIG.weekFields.start);
    const weekEndRaw = getRaw(weekRecord, weeksTable, CONFIG.weekFields.end);

    const weekStartKey = firstNonBlank(
        getText(weekRecord, weeksTable, CONFIG.weekFields.startKey),
        toLocalDateKey(weekStartRaw)
    );

    const weekEndKey = firstNonBlank(
        getText(weekRecord, weeksTable, CONFIG.weekFields.endKey),
        toLocalDateKey(weekEndRaw)
    );

    const weekLabel = weekName || `${formatDate(weekStartRaw)} - ${formatDate(weekEndRaw)}`;

    /* ---------- Send Mode Normalization ---------- */

    function normalizeSendMode(value) {
        const raw = String(value || "").trim().toLowerCase();

        if (["live", "l", "real", "send", "parent"].includes(raw)) {
            return "live";
        }

        if (["test", "t", "preview", "practice", "draft"].includes(raw)) {
            return "test";
        }

        return "";
    }

    const sendModeFromRecord = fieldExists(summaryTable, CONFIG.summaryFields.sendMode)
        ? getText(summaryRecord, summaryTable, CONFIG.summaryFields.sendMode)
        : "";

    const sendMode = firstNonBlank(
        normalizeSendMode(sendModeInput),
        normalizeSendMode(sendModeFromRecord),
        "test"
    );

    /* =========================================================
       SECTION 9: XP RULE NORMALIZATION
       ========================================================= */

    function isRuleActive(ruleRecord) {
        if (!fieldExists(xpRulesTable, CONFIG.xpRuleFields.active)) return true;
        return getBooleanish(ruleRecord, xpRulesTable, CONFIG.xpRuleFields.active);
    }

    function normalizeGradeBandForRule(value) {
        const original = String(value || "");
        const text = compactKey(original);

        if (text.includes("K2") || original.includes("K-2")) return "K2";
        if (text.includes("34") || original.includes("3-4")) return "34";
        if (text.includes("56") || original.includes("5-6")) return "56";
        if (text.includes("78") || original.includes("7-8")) return "78";
        if (text.includes("912") || original.includes("9-12")) return "912";

        return text;
    }

    const enrollmentGradeKey = normalizeGradeBandForRule(gradeBandText);

    const xpRuleRows = xpRulesQuery.records.map(rule => {
        const ruleKey = getText(rule, xpRulesTable, CONFIG.xpRuleFields.ruleKey);
        const sourceLabel = getText(rule, xpRulesTable, CONFIG.xpRuleFields.sourceLabel);
        const ruleName = ruleNameField
            ? getText(rule, xpRulesTable, ruleNameField)
            : recordDisplay(rule, xpRulesTable);

        const gradeBand = getText(rule, xpRulesTable, CONFIG.xpRuleFields.gradeBand);
        const xpAmount = getNumber(rule, xpRulesTable, CONFIG.xpRuleFields.xpAmount, 0);

        return {
            id: rule.id,
            ruleName,
            ruleKey,
            sourceLabel,
            gradeBand,
            gradeKey: normalizeGradeBandForRule(gradeBand),
            xpAmount,
            active: isRuleActive(rule),
            description: getText(rule, xpRulesTable, CONFIG.xpRuleFields.description),
        };
    }).filter(rule => rule.active);

    function findRuleByExactKey(ruleKey) {
        const wanted = normalizeText(ruleKey);

        return xpRuleRows.find(rule =>
            normalizeText(rule.ruleKey) === wanted
        ) || null;
    }

    function findThresholdRule(percent) {
        const percentText = String(percent);

        const candidates = xpRuleRows.filter(rule => {
            const key = compactKey(rule.ruleKey);
            return key.includes(`WEEKLYTHRESHOLD${percentText}`);
        });

        if (candidates.length === 0) return null;

        const gradeMatch = candidates.find(rule =>
            rule.gradeKey && enrollmentGradeKey && rule.gradeKey === enrollmentGradeKey
        );

        return gradeMatch || candidates[0];
    }

    function parseStreakDaysFromRule(rule) {
        const combined = `${rule.ruleKey} ${rule.sourceLabel} ${rule.ruleName}`;

        const dayMatch = combined.match(/(\d+)\s*[- ]?\s*day/i);
        if (dayMatch) return Number(dayMatch[1]);

        const keyMatch = combined.match(/STREAK[_ ]?(\d+)/i);
        if (keyMatch) return Number(keyMatch[1]);

        return 0;
    }

    const shootingBaseRule = findRuleByExactKey(CONFIG.ruleKeys.shootingBase);
    const shootingBaseXp = shootingBaseRule?.xpAmount || 0;

    const streakRuleRows = xpRuleRows
        .filter(rule => compactKey(rule.ruleKey).startsWith(compactKey(CONFIG.ruleKeys.streakPrefix)))
        .map(rule => ({
            ...rule,
            streakDays: parseStreakDaysFromRule(rule),
            label: firstNonBlank(rule.sourceLabel, rule.ruleName, `${parseStreakDaysFromRule(rule)}-Day Streak`),
        }))
        .filter(rule => rule.streakDays > 0)
        .sort((a, b) => a.streakDays - b.streakDays);

    const thresholdRulesByPercent = {
        100: findThresholdRule(100),
        125: findThresholdRule(125),
        150: findThresholdRule(150),
    };

    function isVideoRule(rule) {
        const combined = compactKey(`${rule.ruleKey} ${rule.sourceLabel} ${rule.ruleName}`);

        return (
            combined.includes("VIDEO") &&
            !combined.includes("STREAK") &&
            !combined.includes("THRESHOLD")
        );
    }

    const videoRuleRows = xpRuleRows.filter(isVideoRule);

    const videoPossibleXp = videoRuleRows.length > 0
        ? Math.max(...videoRuleRows.map(rule => Number(rule.xpAmount || 0)))
        : CONFIG.defaults.videoXpPossible;

    /* =========================================================
       SECTION 10: EXPECTED HOMEWORK FROM WEEK RECORD
       ========================================================= */

    const expectedHomeworkRows = curriculumQuery.records
        .filter(record => linkedCurriculumIds.includes(record.id))
        .filter(record => {
            if (fieldExists(curriculumTable, CONFIG.curriculumFields.active)) {
                if (!getBooleanish(record, curriculumTable, CONFIG.curriculumFields.active)) return false;
            }

            if (fieldExists(curriculumTable, CONFIG.curriculumFields.published)) {
                if (!getBooleanish(record, curriculumTable, CONFIG.curriculumFields.published)) return false;
            }

            return true;
        })
        .map(record => ({
            id: record.id,
            title: firstNonBlank(
                getText(record, curriculumTable, CONFIG.curriculumFields.assignmentTitle),
                getText(record, curriculumTable, CONFIG.curriculumFields.assignmentFullName),
                recordDisplay(record, curriculumTable),
                "Homework Assignment"
            ),
            assignmentNumber: getNumber(record, curriculumTable, CONFIG.curriculumFields.assignmentNumber, 999),
            order: getNumber(record, curriculumTable, CONFIG.curriculumFields.order, 999),
        }))
        .sort((a, b) => {
            if (a.assignmentNumber !== b.assignmentNumber) {
                return a.assignmentNumber - b.assignmentNumber;
            }

            return a.order - b.order;
        });

    /* =========================================================
       SECTION 11: XP EVENT NORMALIZATION
       ========================================================= */

    function xpEventMatchesEnrollmentAndWeek(record) {
        const xpEnrollmentIds = getLinkedIds(record, xpEventsTable, CONFIG.xpFields.enrollment);
        const xpWeekIds = getLinkedIds(record, xpEventsTable, CONFIG.xpFields.week);

        const linkedFromSummary = linkedXpEventIds.includes(record.id);

        const matchesEnrollment = xpEnrollmentIds.includes(enrollmentId);
        const matchesWeek = xpWeekIds.includes(weekId);

        return linkedFromSummary || (matchesEnrollment && matchesWeek);
    }

    function xpEventIsActive(record) {
        if (!fieldExists(xpEventsTable, CONFIG.xpFields.active)) return true;
        return getBooleanish(record, xpEventsTable, CONFIG.xpFields.active);
    }

    function getBucketKey(row) {
        return normalizeBucketKey(row.bucketKey);
    }

    const xpRows = xpEventsQuery.records
        .filter(xpEventMatchesEnrollmentAndWeek)
        .filter(xpEventIsActive)
        .map(record => {
            const bucketKeyRaw = getText(record, xpEventsTable, CONFIG.xpFields.bucketKey);

            return {
                id: record.id,
                source: getText(record, xpEventsTable, CONFIG.xpFields.source),
                bucketKey: bucketKeyRaw,
                bucketKeyNormalized: normalizeBucketKey(bucketKeyRaw),
                points: getNumber(record, xpEventsTable, CONFIG.xpFields.points, 0),
                reason: getText(record, xpEventsTable, CONFIG.xpFields.reason),
                sourceKey: getText(record, xpEventsTable, CONFIG.xpFields.sourceKey),
                submissionIds: getLinkedIds(record, xpEventsTable, CONFIG.xpFields.submission),
                videoFeedbackIds: getLinkedIds(record, xpEventsTable, CONFIG.xpFields.videoFeedback),
                achievementUnlockIds: getLinkedIds(record, xpEventsTable, CONFIG.xpFields.achievementUnlock),
            };
        });

    function isShootingXp(row) {
        return getBucketKey(row) === "SHOOTING_BASE";
    }

    function isHomeworkXp(row) {
        return getBucketKey(row) === "HOMEWORK_COMPLETION";
    }

    function isZoomXp(row) {
        return getBucketKey(row) === "ZOOM_ATTENDANCE";
    }

    function isVideoXp(row) {
        return getBucketKey(row) === "VIDEO_FEEDBACK";
    }

    function isStreakXp(row) {
        return getBucketKey(row) === "STREAK";
    }

    function isThresholdXp(row) {
        return getBucketKey(row) === "WEEKLY_THRESHOLD";
    }

    function isManualBonusXp(row) {
        return getBucketKey(row) === "MANUAL_BONUS";
    }

    function xpRowsForSubmission(submissionId) {
        return xpRows.filter(row =>
            row.submissionIds.includes(submissionId) &&
            isShootingXp(row)
        );
    }

    const shootingXpRows = xpRows.filter(isShootingXp);
    const homeworkXpRows = xpRows.filter(isHomeworkXp);
    const zoomXpRows = xpRows.filter(isZoomXp);
    const videoXpRows = xpRows.filter(isVideoXp);
    const streakXpRows = xpRows.filter(isStreakXp);
    const thresholdXpRows = xpRows.filter(isThresholdXp);
    const manualBonusXpRows = xpRows.filter(isManualBonusXp);

    const validBucketKeys = [
        "SHOOTING_BASE",
        "HOMEWORK_COMPLETION",
        "VIDEO_FEEDBACK",
        "ZOOM_ATTENDANCE",
        "STREAK",
        "WEEKLY_THRESHOLD",
        "MANUAL_BONUS",
    ];

    const unbucketedXpRows = xpRows.filter(row => !getBucketKey(row));

    const unknownBucketXpRows = xpRows.filter(row => {
        const bucket = getBucketKey(row);
        return bucket && !validBucketKeys.includes(bucket);
    });

    /* =========================================================
       SECTION 12: SUBMISSION ROWS
       ========================================================= */

    function submissionMatchesSummaryWeekEnrollment(record) {
        if (linkedSubmissionIds.includes(record.id)) return true;

        const submissionEnrollmentIds = getLinkedIds(
            record,
            submissionsTable,
            CONFIG.submissionFields.enrollment
        );

        const submissionWeekIds = getLinkedIds(
            record,
            submissionsTable,
            CONFIG.submissionFields.week
        );

        return submissionEnrollmentIds.includes(enrollmentId) && submissionWeekIds.includes(weekId);
    }

    function submissionIsInsideWeek(row) {
        if (!row.dateKey || !weekStartKey || !weekEndKey) {
            return true;
        }

        return row.dateKey >= weekStartKey && row.dateKey <= weekEndKey;
    }

    function getShootingXpForSubmission(submissionId, countThis) {
        const matchingXpRows = xpRowsForSubmission(submissionId);
        const actualXpFromEvents = sumNumbers(matchingXpRows, "points");

        if (actualXpFromEvents > 0) {
            return {
                actualXpFromEvents,
                displayedXp: actualXpFromEvents,
                xpEventMissing: false,
            };
        }

        return {
            actualXpFromEvents: 0,
            displayedXp: countThis ? shootingBaseXp : 0,
            xpEventMissing: countThis && shootingBaseXp > 0,
        };
    }

    const submissionRows = submissionsQuery.records
        .filter(submissionMatchesSummaryWeekEnrollment)
        .map(record => {
            const activityDateRaw = getRaw(
                record,
                submissionsTable,
                CONFIG.submissionFields.activityDate
            );

            const activityDateKey = firstNonBlank(
                getText(record, submissionsTable, CONFIG.submissionFields.activityDateKey),
                toLocalDateKey(activityDateRaw)
            );

            const countThis = fieldExists(submissionsTable, CONFIG.submissionFields.countThis)
                ? getBooleanish(record, submissionsTable, CONFIG.submissionFields.countThis)
                : true;

            const xpInfo = getShootingXpForSubmission(record.id, countThis);

            return {
                id: record.id,
                activityDateRaw,
                dateKey: activityDateKey,
                dateLabel: formatDayLabel(activityDateKey || activityDateRaw),
                shots: submissionShotsField
                    ? getNumber(record, submissionsTable, submissionShotsField, 0)
                    : 0,
                countThis,
                homeworkName1: getText(record, submissionsTable, CONFIG.submissionFields.homeworkName1),
                homeworkName2: getText(record, submissionsTable, CONFIG.submissionFields.homeworkName2),
                actualXpFromEvents: xpInfo.actualXpFromEvents,
                displayedXp: xpInfo.displayedXp,
                xpEventMissing: xpInfo.xpEventMissing,
            };
        })
        .filter(submissionIsInsideWeek)
        .sort((a, b) => {
            return String(a.dateKey || "").localeCompare(String(b.dateKey || ""));
        });

    const countedSubmissionRows = submissionRows.filter(row => row.countThis);

    const totalShotsCalculated = submissionRows.reduce(
        (sum, row) => sum + (Number(row.shots) || 0),
        0
    );

    const daysLoggedCalculated = new Set(
        countedSubmissionRows.map(row => row.dateKey).filter(Boolean)
    ).size;

    const storedTotalShots = fieldExists(summaryTable, CONFIG.summaryFields.totalShots)
        ? getNumber(summaryRecord, summaryTable, CONFIG.summaryFields.totalShots, 0)
        : 0;

    const storedDaysLogged = fieldExists(summaryTable, CONFIG.summaryFields.daysLogged)
        ? getNumber(summaryRecord, summaryTable, CONFIG.summaryFields.daysLogged, 0)
        : 0;

    const totalShots = totalShotsCalculated;
    const daysLogged = daysLoggedCalculated;

    const shootingDisplayXp = countedSubmissionRows.reduce(
        (sum, row) => sum + (Number(row.displayedXp) || 0),
        0
    );

    const weeklyShotDetailRows = submissionRows.map((row, index) => [
        row.dateLabel || `Submission ${index + 1}`,
        String(row.shots || 0),
        row.countThis ? formatXp(row.displayedXp) : "Not counted",
    ]);

    /* =========================================================
       SECTION 13: HOMEWORK ROWS
       ========================================================= */

    const inferredHomeworkNames = [];

    submissionRows.forEach(row => {
        if (row.homeworkName1) inferredHomeworkNames.push(row.homeworkName1);
        if (row.homeworkName2) inferredHomeworkNames.push(row.homeworkName2);
    });

    const uniqueHomeworkNames = [...new Set(
        inferredHomeworkNames
            .map(name => String(name || "").trim())
            .filter(Boolean)
    )];

    function cleanHomeworkTitle(value) {
        return String(value || "")
            .replace(/^.*\|/g, "")
            .replace(/^SA\s*-\s*/i, "")
            .replace(/^Char\d+\s*-\s*/i, "")
            .replace(/^Personal Game Plan\s*-\s*/i, "")
            .replace(/^Responsibility\s*-\s*/i, "")
            .replace(/^Shooting\s*-\s*/i, "")
            .replace(/^Character\s*-\s*/i, "")
            .replace(/homework completion/gi, "")
            .replace(/homework assignment completed satisfactorily/gi, "")
            .replace(/homework completion xp awarded/gi, "")
            .replace(/homework completion key\s*=.*$/gi, "")
            .trim();
    }

    function homeworkCompletionMatchesExpected(completionRow, expectedTitle) {
        const completionName = normalizeText(cleanHomeworkTitle(completionRow.homeworkName));
        const expectedName = normalizeText(cleanHomeworkTitle(expectedTitle));

        if (!completionName || !expectedName) return false;

        return (
            completionName === expectedName ||
            completionName.includes(expectedName) ||
            expectedName.includes(completionName)
        );
    }

    function homeworkXpMatchesTitle(xpRow, expectedTitle) {
        const expected = normalizeText(cleanHomeworkTitle(expectedTitle));
        const reasonRaw = String(xpRow.reason || "");
        const sourceKeyRaw = String(xpRow.sourceKey || "");

        const reasonClean = normalizeText(cleanHomeworkTitle(reasonRaw));
        const reasonFull = normalizeText(reasonRaw);
        const sourceKeyFull = normalizeText(sourceKeyRaw);

        if (!expected) return false;
        if (!isHomeworkXp(xpRow)) return false;

        return (
            reasonClean.includes(expected) ||
            reasonFull.includes(expected) ||
            sourceKeyFull.includes(expected) ||
            expected.includes(reasonClean)
        );
    }

    const homeworkCompletionRows = homeworkQuery.records
        .filter(record => linkedHomeworkIds.includes(record.id))
        .map((record, index) => {
            const feedback1 = getText(record, homeworkTable, CONFIG.homeworkFields.feedback1);
            const feedback2 = getText(record, homeworkTable, CONFIG.homeworkFields.feedback2);

            const homeworkName = firstNonBlank(
                getText(record, homeworkTable, CONFIG.homeworkFields.homework),
                uniqueHomeworkNames[index],
                `Homework ${index + 1}`
            );

            const satisfactory = fieldExists(homeworkTable, CONFIG.homeworkFields.satisfactory)
                ? getBooleanish(record, homeworkTable, CONFIG.homeworkFields.satisfactory)
                : false;

            const xpAwarded = fieldExists(homeworkTable, CONFIG.homeworkFields.xpTotal)
                ? getNumber(record, homeworkTable, CONFIG.homeworkFields.xpTotal, 0)
                : 0;

            return {
                id: record.id,
                homeworkName,
                satisfactory,
                status: satisfactory ? "Satisfactory" : "Submitted - not satisfactory",
                xpPossible: CONFIG.defaults.homeworkXpPossible,
                xpAwarded,
                feedback: [feedback1, feedback2].filter(Boolean).join(" ").trim(),
                source: "Homework Completion Record",
                matchedXpEventIds: [],
            };
        });

    const expectedHomeworkTitles = expectedHomeworkRows.length > 0
        ? expectedHomeworkRows.map(row => row.title)
        : uniqueHomeworkNames.slice(0, 2);

    const usedHomeworkXpEventIds = new Set();

    const homeworkRows = expectedHomeworkTitles.length > 0
        ? expectedHomeworkTitles.map((title, index) => {
            const matchingCompletion = homeworkCompletionRows.find(row =>
                homeworkCompletionMatchesExpected(row, title)
            );

            if (matchingCompletion) {
                return {
                    ...matchingCompletion,
                    homeworkName: title,
                };
            }

            const matchingHomeworkXpRows = homeworkXpRows.filter(row =>
                !usedHomeworkXpEventIds.has(row.id) &&
                homeworkXpMatchesTitle(row, title)
            );

            const xpFromEvents = matchingHomeworkXpRows.reduce(
                (sum, row) => sum + (Number(row.points) || 0),
                0
            );

            if (xpFromEvents > 0) {
                matchingHomeworkXpRows.forEach(row => usedHomeworkXpEventIds.add(row.id));

                return {
                    id: "",
                    homeworkName: title || `Homework ${index + 1}`,
                    satisfactory: true,
                    status: "Satisfactory",
                    xpPossible: CONFIG.defaults.homeworkXpPossible,
                    xpAwarded: xpFromEvents,
                    feedback: "Completed",
                    source: "XP Event Backup",
                    matchedXpEventIds: matchingHomeworkXpRows.map(row => row.id),
                };
            }

            return {
                id: "",
                homeworkName: title || `Homework ${index + 1}`,
                satisfactory: false,
                status: "Not submitted",
                xpPossible: CONFIG.defaults.homeworkXpPossible,
                xpAwarded: 0,
                feedback: "",
                source: "Expected Assignment Only",
                matchedXpEventIds: [],
            };
        })
        : homeworkCompletionRows;

    const unmatchedHomeworkXpRows = homeworkXpRows.filter(row =>
        !usedHomeworkXpEventIds.has(row.id) &&
        Number(row.points || 0) > 0
    );

    for (const xpRow of unmatchedHomeworkXpRows) {
        const rowToCredit = homeworkRows.find(row =>
            !row.satisfactory &&
            Number(row.xpAwarded || 0) === 0
        );

        if (!rowToCredit) break;

        rowToCredit.satisfactory = true;
        rowToCredit.status = "Satisfactory";
        rowToCredit.xpAwarded = Number(xpRow.points || 0);
        rowToCredit.feedback = "Completed";
        rowToCredit.source = "Unmatched XP Event Backup";
        rowToCredit.matchedXpEventIds = [xpRow.id];

        usedHomeworkXpEventIds.add(xpRow.id);
    }

    const homeworkAssignedCount = homeworkRows.length;
    const homeworkSatisfactoryCount = homeworkRows.filter(row => row.satisfactory).length;

    const homeworkDetailRows = homeworkRows.map(row => [
        row.homeworkName,
        row.status,
        formatXpFraction(row.xpAwarded, row.xpPossible),
    ]);

    const homeworkDisplayXp = homeworkRows.reduce(
        (sum, row) => sum + (Number(row.xpAwarded) || 0),
        0
    );

    /* =========================================================
       SECTION 14: ZOOM ROWS
       ========================================================= */

    const zoomRows = zoomQuery.records
        .filter(record => {
            const zoomWeekIds = getLinkedIds(record, zoomTable, CONFIG.zoomFields.week);
            return zoomWeekIds.includes(weekId);
        })
        .map((record, index) => {
            const attendees = getLinkedIds(record, zoomTable, CONFIG.zoomFields.attendees);
            const attended = attendees.includes(enrollmentId);

            const matchingXp = zoomXpRows[index];
            const xpAwarded = matchingXp ? matchingXp.points : 0;

            return {
                id: record.id,
                title: recordDisplay(record, zoomTable) || `Zoom Meeting ${index + 1}`,
                attended,
                status: attended ? "Attended" : "Did not attend",
                xpPossible: CONFIG.defaults.zoomXpPossible,
                xpAwarded,
            };
        });

    const zoomDetailRows = zoomRows.map(row => [
        row.title,
        row.status,
        formatXpFraction(row.xpAwarded, row.xpPossible),
    ]);

    const zoomDisplayXp = zoomRows.reduce(
        (sum, row) => sum + (Number(row.xpAwarded) || 0),
        0
    );

    /* =========================================================
       SECTION 15: VIDEO FEEDBACK ROWS
       ========================================================= */

    function videoMatchesEnrollmentAndWeek(record) {
        const videoEnrollmentIds = getLinkedIds(record, videoTable, CONFIG.videoFields.enrollment);
        const submissionId = getFirstLinkedId(record, videoTable, CONFIG.videoFields.submission);

        if (!videoEnrollmentIds.includes(enrollmentId)) return false;

        if (!submissionId) return true;

        return submissionRows.some(row => row.id === submissionId);
    }

    const actualVideoRows = videoQuery.records
        .filter(videoMatchesEnrollmentAndWeek)
        .map((record, index) => {
            const activityDateRaw = getRaw(
                record,
                videoTable,
                CONFIG.videoFields.activityDateLkp
            );

            const feedbackPosted = fieldExists(videoTable, CONFIG.videoFields.feedbackPosted)
                ? getBooleanish(record, videoTable, CONFIG.videoFields.feedbackPosted)
                : false;

            const doNotAward = fieldExists(videoTable, CONFIG.videoFields.doNotAward)
                ? getBooleanish(record, videoTable, CONFIG.videoFields.doNotAward)
                : false;

            const totalXp = fieldExists(videoTable, CONFIG.videoFields.totalXp)
                ? getNumber(record, videoTable, CONFIG.videoFields.totalXp, 0)
                : 0;

            const matchingVideoXp = videoXpRows.filter(row =>
                row.videoFeedbackIds.includes(record.id)
            );

            const xpFromEvents = matchingVideoXp.reduce(
                (sum, row) => sum + (Number(row.points) || 0),
                0
            );

            const xpAwarded = totalXp || xpFromEvents;

            const awardStatus = getText(record, videoTable, CONFIG.videoFields.awardStatus);

            let status = "Submitted";
            if (doNotAward) status = "No XP awarded";
            else if (feedbackPosted) status = "Feedback posted";
            else if (awardStatus) status = awardStatus;

            return {
                id: record.id,
                activityDateLabel: formatDayLabel(activityDateRaw),
                title: recordDisplay(record, videoTable) || `Video Feedback ${index + 1}`,
                status,
                xpPossible: Math.max(videoPossibleXp, xpAwarded || 0),
                xpAwarded,
            };
        })
        .sort((a, b) => {
            const aKey = toLocalDateKey(a.activityDateLabel);
            const bKey = toLocalDateKey(b.activityDateLabel);
            return String(aKey).localeCompare(String(bKey));
        });

    const videoRows = actualVideoRows.length > 0
        ? actualVideoRows
        : [{
            id: "",
            activityDateLabel: "Not submitted",
            title: "Weekly Video Feedback Opportunity",
            status: "Not submitted",
            xpPossible: videoPossibleXp,
            xpAwarded: 0,
        }];

    const videoDetailRows = videoRows.map((row, index) => [
        row.activityDateLabel || "No date",
        row.title || `Video ${index + 1}`,
        row.status,
        formatXpFraction(row.xpAwarded, row.xpPossible),
    ]);

    const videoDisplayXp = videoRows.reduce(
        (sum, row) => sum + (Number(row.xpAwarded) || 0),
        0
    );

    /* =========================================================
       SECTION 16: STREAK ROWS
       ========================================================= */

    function xpRowMatchesStreakRule(row, rule) {
        if (!isStreakXp(row)) return false;

        const combined = compactKey(`${row.source} ${row.reason} ${row.sourceKey}`);
        const ruleKey = compactKey(rule.ruleKey);
        const label = compactKey(rule.label);

        return (
            combined.includes(ruleKey) ||
            combined.includes(label) ||
            combined.includes(`STREAK${rule.streakDays}DAY`) ||
            combined.includes(`${rule.streakDays}DAYSTREAK`)
        );
    }

    const streakDetailRows = streakRuleRows.map(rule => {
        const matches = streakXpRows.filter(row => xpRowMatchesStreakRule(row, rule));

        const xpEarned = matches.length > 0
            ? matches.reduce((sum, row) => sum + (Number(row.points) || 0), 0)
            : 0;

        const xpPossible = Number(rule.xpAmount || 0);
        const status = xpEarned > 0 ? "Earned this week" : "Not recorded this week";

        return [
            rule.label || `${rule.streakDays}-Day Streak`,
            status,
            formatXpFraction(xpEarned, xpPossible),
        ];
    });

    const streakDisplayXp = streakXpRows.reduce(
        (sum, row) => sum + (Number(row.points) || 0),
        0
    );

    /* =========================================================
       SECTION 17: THRESHOLD ROWS
       ========================================================= */

    const weeklyGoalTarget = fieldExists(summaryTable, CONFIG.summaryFields.weeklyGoalTarget)
        ? getNumber(summaryRecord, summaryTable, CONFIG.summaryFields.weeklyGoalTarget, 0)
        : 0;

    const thresholdValue = fieldExists(summaryTable, CONFIG.summaryFields.thresholdValue)
        ? getNumber(summaryRecord, summaryTable, CONFIG.summaryFields.thresholdValue, 0)
        : 0;

    const baseThresholdTarget = weeklyGoalTarget || thresholdValue || 0;

    function thresholdRequiredShots(percent) {
        if (!baseThresholdTarget) return 0;
        return Math.ceil(baseThresholdTarget * (Number(percent) / 100));
    }

    function thresholdXpRowsForPercent(percent) {
        const percentText = String(percent);

        return thresholdXpRows.filter(row => {
            const source = compactKey(row.source);
            const sourceKey = compactKey(row.sourceKey);
            const reason = compactKey(row.reason);

            return (
                source.includes(`WEEKLYTHRESHOLD${percentText}`) ||
                source.includes(`THRESHOLD${percentText}`) ||
                sourceKey.includes(`WEEKLYTHRESHOLD${percentText}`) ||
                sourceKey.includes(`THRESHOLD${percentText}`) ||
                reason.includes(`WEEKLYTHRESHOLD${percentText}`) ||
                reason.includes(`THRESHOLD${percentText}`)
            );
        });
    }

    const thresholdDetailObjects = [100, 125, 150].map(percent => {
        const required = thresholdRequiredShots(percent);
        const rule = thresholdRulesByPercent[percent];

        const matchingXpRows = thresholdXpRowsForPercent(percent);
        const xpFromEvents = matchingXpRows.reduce(
            (sum, row) => sum + (Number(row.points) || 0),
            0
        );

        const reached = required > 0 && totalShots >= required;
        const xpPossible = rule ? Number(rule.xpAmount || 0) : 0;

        const xpEarned = reached
            ? (xpFromEvents > 0 ? xpFromEvents : xpPossible)
            : 0;

        const status = reached ? "Reached" : "Not reached";

        return {
            percent,
            required,
            actual: totalShots || 0,
            status,
            xpEarned,
            xpPossible,
            xpFromEvents,
        };
    });

    const thresholdDetailRows = thresholdDetailObjects.map(row => [
        `${row.percent}% of Target`,
        row.required ? String(row.required) : "No target",
        String(row.actual),
        row.status,
        formatXpFraction(row.xpEarned, row.xpPossible),
    ]);

    const thresholdDisplayXp = thresholdDetailObjects.reduce(
        (sum, row) => sum + (Number(row.xpEarned) || 0),
        0
    );

    /* =========================================================
       SECTION 18: WEEKLY XP SUMMARY ROWS
       ========================================================= */

    const otherXpRows = xpRows.filter(row => {
        return !(
            isShootingXp(row) ||
            isHomeworkXp(row) ||
            isZoomXp(row) ||
            isVideoXp(row) ||
            isStreakXp(row) ||
            isThresholdXp(row) ||
            isManualBonusXp(row)
        );
    });

    const manualBonusXp = manualBonusXpRows.reduce(
        (sum, row) => sum + (Number(row.points) || 0),
        0
    );

    const otherXp = otherXpRows.reduce(
        (sum, row) => sum + (Number(row.points) || 0),
        0
    );

    const calculatedWeeklyXp =
        shootingDisplayXp +
        homeworkDisplayXp +
        zoomDisplayXp +
        videoDisplayXp +
        streakDisplayXp +
        thresholdDisplayXp +
        manualBonusXp +
        otherXp;

    const storedWeeklyXp = fieldExists(summaryTable, CONFIG.summaryFields.weeklyXp)
        ? getNumber(summaryRecord, summaryTable, CONFIG.summaryFields.weeklyXp, 0)
        : 0;

    const weeklyXpForEmail = calculatedWeeklyXp || storedWeeklyXp;

    const videoSummaryLabel = actualVideoRows.length > 0
        ? "Video feedback items"
        : "No video submitted";

    const weeklyXpDetailRows = [
        [
            "Shooting",
            `${countedSubmissionRows.length} counted shooting submission(s)`,
            formatXp(shootingDisplayXp),
        ],
        [
            "Homework",
            `${homeworkSatisfactoryCount} of ${homeworkAssignedCount} satisfactory`,
            formatXp(homeworkDisplayXp),
        ],
        [
            "Zoom",
            zoomRows.length > 0 ? "Weekly Zoom attendance" : "No Zoom items",
            formatXp(zoomDisplayXp),
        ],
        [
            "Video Feedback",
            videoSummaryLabel,
            formatXp(videoDisplayXp),
        ],
        [
            "Streaks",
            "Streak awards recorded this week",
            formatXp(streakDisplayXp),
        ],
        [
            "Thresholds",
            baseThresholdTarget
                ? `Weekly target: ${roundWhole(baseThresholdTarget)} shots`
                : "No weekly target",
            formatXp(thresholdDisplayXp),
        ],
        ...(manualBonusXp > 0
            ? [["Manual Bonus", "Manual bonus XP", formatXp(manualBonusXp)]]
            : []),
        ...(otherXp > 0
            ? [["Other XP", "Additional or unbucketed XP items", formatXp(otherXp)]]
            : []),
    ];

    const weeklyXpEventRows = xpRows
        .slice()
        .sort((a, b) => b.points - a.points)
        .map(row => {
            let source = row.source || "XP Event";
            let reason = row.reason || "Weekly XP item";

            if (isShootingXp(row)) {
                source = "Shooting Submission";
                reason = "Base XP for a counted shooting submission.";
            }

            if (isHomeworkXp(row)) {
                source = "Homework Completion";
                reason = "Homework assignment completed satisfactorily.";
            }

            if (isZoomXp(row)) {
                source = "Zoom Attendance";
                reason = "Zoom meeting attendance XP earned.";
            }

            if (isVideoXp(row)) {
                source = "Video Feedback";
                reason = "Video feedback XP earned.";
            }

            if (isStreakXp(row)) {
                source = row.source || "Streak Award";
                reason = `${source} earned this week.`;
            }

            if (isThresholdXp(row)) {
                source = row.source || "Threshold Award";
                reason = `${source} earned this week.`;
            }

            if (isManualBonusXp(row)) {
                source = "Manual Bonus";
                reason = row.reason || "Manual bonus XP awarded.";
            }

            reason = String(reason || "")
                .replace(/SHOOTING_BASE_34/gi, "SHOOTING_BASE")
                .replace(/Base shooting XP from rule SHOOTING_BASE\./gi, "Base shooting XP.")
                .replace(/Submission Record = rec[a-zA-Z0-9]+\.?/g, "")
                .replace(/Unlock Record = rec[a-zA-Z0-9]+\.?/g, "")
                .replace(/Legacy Submission Key = [^\.]+\.?/g, "")
                .replace(/Streak Instance Key = [^\.]+\.?/g, "")
                .replace(/Homework Completion Key = .*$/gi, "")
                .replace(/Context:.*$/gi, "")
                .replace(/\s+/g, " ")
                .trim();

            return [
                source,
                reason || "Weekly XP item.",
                formatXp(row.points),
            ];
        });

    /* =========================================================
       SECTION 19: CARD HTML
       ========================================================= */

    const subjectOut = `${BRAND.brandName} Weekly Summary | ${athleteName} | ${weekLabel}`;

    const summaryBadgesHtml = [
        renderBadge("Athlete", athleteName),
        renderBadge("Week", weekLabel),
        renderBadge("Current Level", currentLevelText),
        renderBadge("Days Logged", String(daysLogged)),
        renderBadge("Shots", String(totalShots)),
        renderBadge("Weekly XP", String(weeklyXpForEmail)),
    ].join("");

    const introHtml = `
        <p style="margin:0 0 8px 0;font-size:10px;">Hello,</p>
        <p style="margin:0;font-size:10px;">
            Here is your weekly ${escapeHtml(BRAND.brandName)} summary for <strong>${escapeHtml(athleteName)}</strong>.
            This report shows shooting activity, homework, Zoom attendance, video feedback, streaks, thresholds, and XP earned for the week.
        </p>
    `;

    const shootingCardHtml = `
        <p style="margin:0 0 8px 0;font-size:10px;">
            <strong>Total this week:</strong> ${roundWhole(totalShots)} shots • ${daysLogged} day(s) logged.
        </p>
        ${renderCompactTable(
            ["Date", "Shots", "XP Earned"],
            weeklyShotDetailRows,
            "No shooting submissions were recorded this week."
        )}
    `;

    const homeworkCardHtml = `
        <p style="margin:0 0 8px 0;font-size:10px;">
            <strong>Homework:</strong> ${homeworkSatisfactoryCount} of ${homeworkAssignedCount} satisfactory.
        </p>
        ${renderCompactTable(
            ["Homework Assignment", "Status", "XP Earned / Possible"],
            homeworkDetailRows,
            "No homework items were recorded this week."
        )}
    `;

    const zoomCardHtml = renderCompactTable(
        ["Zoom Meeting", "Status", "XP Earned / Possible"],
        zoomDetailRows,
        "No Zoom meeting items were recorded this week."
    );

    const videoCardHtml = renderCompactTable(
        ["Activity Date", "Video Feedback", "Status", "XP Earned / Possible"],
        videoDetailRows,
        "No video feedback items were recorded this week."
    );

    const streakCardHtml = renderCompactTable(
        ["Streak Award", "Status", "XP Earned / Possible"],
        streakDetailRows,
        "No streak rules were found."
    );

    const thresholdCardHtml = `
        <p style="margin:0 0 8px 0;font-size:10px;">
            <strong>Weekly Shot Target:</strong> ${baseThresholdTarget ? roundWhole(baseThresholdTarget) : "No target found"} shots
            ${baseThresholdTarget ? ` • <strong>Actual:</strong> ${roundWhole(totalShots)} shots` : ""}
        </p>
        ${renderCompactTable(
            ["Threshold", "Required Shots", "Actual Shots", "Status", "XP Earned / Possible"],
            thresholdDetailRows,
            "No threshold items were recorded this week."
        )}
    `;

    const xpCardHtml = `
        <p style="margin:0 0 8px 0;font-size:10px;">
            <strong>Total weekly XP shown in this email:</strong> ${roundWhole(weeklyXpForEmail)}
        </p>
        ${renderCompactTable(
            ["Bucket", "Summary", "XP"],
            weeklyXpDetailRows,
            "No weekly XP buckets were recorded."
        )}
        ${weeklyXpEventRows.length > 0 ? `
            <div style="margin-top:12px;font-size:12px;font-weight:800;color:${BRAND.orange};">XP Event Detail</div>
            <div style="margin-top:7px;">
                ${renderCompactTable(
                    ["Source", "Reason", "XP"],
                    weeklyXpEventRows,
                    ""
                )}
            </div>
        ` : ""}
    `;

    const closingHtml = `
        <p style="margin:0 0 7px 0;font-size:10px;">Thank you for the work you put in this week.</p>
        <p style="margin:0;font-size:10px;">Questions are always welcome.</p>
    `;

    /* =========================================================
       SECTION 20: FINAL HTML
       ========================================================= */

    const htmlOut = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(subjectOut)}</title>
    </head>
    <body style="margin:0;padding:0;background:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
      <div style="background:${BRAND.bg};padding:16px 10px;">
        <div style="max-width:${BRAND.width};margin:0 auto;">
          <div style="background:${BRAND.blue};border-radius:16px;padding:18px 20px;margin:0 0 12px 0;color:#FFFFFF;">
            <div style="font-size:9px;letter-spacing:.45px;text-transform:uppercase;opacity:.95;margin:0 0 4px 0;">Weekly Summary</div>
            <div style="font-size:21px;line-height:1.15;font-weight:800;margin:0 0 5px 0;">${escapeHtml(athleteName)}</div>
            <div style="font-size:11px;line-height:1.35;opacity:.95;">${escapeHtml(weekLabel)}</div>
          </div>

          <div style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:14px;padding:12px 14px;margin:0 0 12px 0;">
            ${summaryBadgesHtml}
          </div>

          ${renderCard("Welcome", introHtml)}
          ${renderCard("Weekly Shooting Summary", shootingCardHtml)}
          ${renderCard("Homework", homeworkCardHtml)}
          ${renderCard("Zoom Meeting Attendance", zoomCardHtml)}
          ${renderCard("Video Feedback", videoCardHtml)}
          ${renderCard("Streaks", streakCardHtml)}
          ${renderCard("Thresholds", thresholdCardHtml)}
          ${renderCard("Weekly XP Earned", xpCardHtml)}
          ${renderCard("Closing", closingHtml)}

          <div style="background:${BRAND.blue};border-radius:14px;padding:12px 14px;color:#FFFFFF;">
            <div style="font-size:10px;font-weight:700;margin:0 0 3px 0;">${escapeHtml(BRAND.brandName)}</div>
            <div style="font-size:9px;line-height:1.35;opacity:.95;">Weekly Summary Package</div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `.trim();

    /* =========================================================
       SECTION 21: TEXT VERSION AND PAYLOAD
       ========================================================= */

    const textSections = [
        "Weekly Summary",
        athleteName,
        weekLabel,
        `Current Level: ${currentLevelText}`,
        `Days Logged: ${daysLogged}`,
        `Shots: ${roundWhole(totalShots)}`,
        `Weekly XP: ${roundWhole(weeklyXpForEmail)}`,
        "",
        "Weekly Shooting Summary",
        ...weeklyShotDetailRows.map(row => row.join(" | ")),
        "",
        "Homework",
        ...homeworkDetailRows.map(row => row.join(" | ")),
        "",
        "Zoom Meeting Attendance",
        ...zoomDetailRows.map(row => row.join(" | ")),
        "",
        "Video Feedback",
        ...videoDetailRows.map(row => row.join(" | ")),
        "",
        "Streaks",
        ...streakDetailRows.map(row => row.join(" | ")),
        "",
        "Thresholds",
        ...thresholdDetailRows.map(row => row.join(" | ")),
        "",
        "Weekly XP Earned",
        ...weeklyXpDetailRows.map(row => row.join(" | ")),
    ].join("\n");

    const textOut = plainTextFromHtml(textSections);

    const xpBucketSummary = {
        shootingBase: shootingXpRows.length,
        homeworkCompletion: homeworkXpRows.length,
        videoFeedback: videoXpRows.length,
        zoomAttendance: zoomXpRows.length,
        streak: streakXpRows.length,
        weeklyThreshold: thresholdXpRows.length,
        manualBonus: manualBonusXpRows.length,
        unbucketed: unbucketedXpRows.length,
        unknownBucket: unknownBucketXpRows.length,
    };

    const payload = {
        sendMode,
        weeklySummaryRecordId: summaryRecord.id,
        weeklyEmailRecordId: summaryRecord.id,
        enrollmentId,
        weekId,
        athleteName,
        weekLabel,
        currentLevel: currentLevelText,
        gradeBand: gradeBandText,
        subject: subjectOut,
        csvemail: recipientsCsv,
        html: htmlOut,
        text: textOut,
        revision: CONFIG.version,
        builtAt: new Date().toISOString(),
        summary: {
            daysLogged,
            totalShots,
            storedDaysLogged,
            storedTotalShots,
            weeklyXpForEmail,
            storedWeeklyXp,
            calculatedWeeklyXp,
            shootingBaseRuleKey: CONFIG.ruleKeys.shootingBase,
            shootingBaseXp,
            weeklyGoalTarget,
            thresholdValue,
        },
        cards: {
            shooting: weeklyShotDetailRows,
            homework: homeworkDetailRows,
            zoom: zoomDetailRows,
            videoFeedback: videoDetailRows,
            streaks: streakDetailRows,
            thresholds: thresholdDetailRows,
            weeklyXp: weeklyXpDetailRows,
            xpEventDetail: weeklyXpEventRows,
        },
        diagnostics: {
            weekStartKey,
            weekEndKey,
            linkedCurriculumCount: linkedCurriculumIds.length,
            expectedHomeworkCount: expectedHomeworkRows.length,
            submissionCount: submissionRows.length,
            countedSubmissionCount: countedSubmissionRows.length,
            storedDaysLogged,
            storedTotalShots,
            calculatedDaysLogged: daysLoggedCalculated,
            calculatedTotalShots: totalShotsCalculated,
            submissionRowsDebug: submissionRows.map(row => ({
                id: row.id,
                dateKey: row.dateKey,
                dateLabel: row.dateLabel,
                shots: row.shots,
                countThis: row.countThis,
                displayedXp: row.displayedXp,
            })),
            xpEventCount: xpRows.length,
            linkedXpEventCount: linkedXpEventIds.length,
            xpBucketSummary,
            unbucketedXpEventIds: unbucketedXpRows.map(row => row.id),
            unknownBucketXpEvents: unknownBucketXpRows.map(row => ({
                id: row.id,
                bucketKey: row.bucketKey,
                source: row.source,
                points: row.points,
            })),
            shootingBaseRuleFound: Boolean(shootingBaseRule),
            streakRuleCount: streakRuleRows.length,
            thresholdRulesFound: {
                100: Boolean(thresholdRulesByPercent[100]),
                125: Boolean(thresholdRulesByPercent[125]),
                150: Boolean(thresholdRulesByPercent[150]),
            },
            notes: [
                "This script builds email output only.",
                "It does not create missing XP Events.",
                "Homework assignments come from Week -> FBC Curriculum - SYNC.",
                "XP bucket classification uses XP Bucket.",
                "Date keys are used to prevent Saturday submissions from being dropped.",
                "Email summary totals use the same calculated rows displayed in the email table.",
                "Streaks and thresholds display XP Earned / Possible.",
            ],
        },
    };

    /* =========================================================
       SECTION 22: WRITE BACK TO WEEKLY ATHLETE SUMMARY
       ========================================================= */

    const updateFields = {};

    if (fieldExists(summaryTable, CONFIG.summaryFields.buildNow)) {
        updateFields[CONFIG.summaryFields.buildNow] = false;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailReady)) {
        updateFields[CONFIG.summaryFields.emailReady] = true;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailSent)) {
        updateFields[CONFIG.summaryFields.emailSent] = false;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.sendToMake)) {
        updateFields[CONFIG.summaryFields.sendToMake] = false;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailSentAt)) {
        updateFields[CONFIG.summaryFields.emailSentAt] = null;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailError)) {
        updateFields[CONFIG.summaryFields.emailError] = "";
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailSubject)) {
        updateFields[CONFIG.summaryFields.emailSubject] = subjectOut;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailRecipients)) {
        updateFields[CONFIG.summaryFields.emailRecipients] = recipientsCsv;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailHtml)) {
        updateFields[CONFIG.summaryFields.emailHtml] = htmlOut;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailText)) {
        updateFields[CONFIG.summaryFields.emailText] = textOut;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailPayloadJson)) {
        updateFields[CONFIG.summaryFields.emailPayloadJson] = JSON.stringify(payload, null, 2);
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailWeekLabel)) {
        updateFields[CONFIG.summaryFields.emailWeekLabel] = weekLabel;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailRevision)) {
        updateFields[CONFIG.summaryFields.emailRevision] = CONFIG.version;
    }

    if (fieldExists(summaryTable, CONFIG.summaryFields.emailLastBuiltAt)) {
        updateFields[CONFIG.summaryFields.emailLastBuiltAt] = new Date().toISOString();
    }

    await summaryTable.updateRecordAsync(recordId, updateFields);

    /* =========================================================
       SECTION 23: OUTPUTS
       ========================================================= */

    setOutputSafe("subjectOut", subjectOut);
    setOutputSafe("htmlOut", htmlOut);
    setOutputSafe("recipientsCsv", recipientsCsv);
    setOutputSafe("sendMode", sendMode);
    setOutputSafe("sendModeDebug", `FINAL SEND MODE USED BY SCRIPT = ${sendMode}`);
    setOutputSafe("statusOut", "success");
    setOutputSafe("errorOut", "");
    setOutputSafe("weeklyXpForEmail", weeklyXpForEmail);
    setOutputSafe("storedWeeklyXp", storedWeeklyXp);
    setOutputSafe("calculatedWeeklyXp", calculatedWeeklyXp);
    setOutputSafe("shootingBaseXp", shootingBaseXp);
    setOutputSafe("submissionCount", submissionRows.length);
    setOutputSafe("countedSubmissionCount", countedSubmissionRows.length);
    setOutputSafe("storedDaysLogged", storedDaysLogged);
    setOutputSafe("storedTotalShots", storedTotalShots);
    setOutputSafe("calculatedDaysLogged", daysLoggedCalculated);
    setOutputSafe("calculatedTotalShots", totalShotsCalculated);
    setOutputSafe("xpEventCount", xpRows.length);
    setOutputSafe("linkedCurriculumCount", linkedCurriculumIds.length);
    setOutputSafe("expectedHomeworkCount", expectedHomeworkRows.length);
    setOutputSafe("weekStartKey", weekStartKey);
    setOutputSafe("weekEndKey", weekEndKey);
    setOutputSafe("submissionDateList", submissionRows.map(row => `${row.dateKey} | ${row.dateLabel} | ${row.shots} shots | ${formatXp(row.displayedXp)} | ${row.id}`).join("\n"));
    setOutputSafe("threshold100Found", Boolean(thresholdRulesByPercent[100]));
    setOutputSafe("threshold125Found", Boolean(thresholdRulesByPercent[125]));
    setOutputSafe("threshold150Found", Boolean(thresholdRulesByPercent[150]));

    setOutputSafe("xpBucketShootingBaseCount", shootingXpRows.length);
    setOutputSafe("xpBucketHomeworkCompletionCount", homeworkXpRows.length);
    setOutputSafe("xpBucketVideoFeedbackCount", videoXpRows.length);
    setOutputSafe("xpBucketZoomAttendanceCount", zoomXpRows.length);
    setOutputSafe("xpBucketStreakCount", streakXpRows.length);
    setOutputSafe("xpBucketWeeklyThresholdCount", thresholdXpRows.length);
    setOutputSafe("xpBucketManualBonusCount", manualBonusXpRows.length);
    setOutputSafe("xpBucketUnbucketedCount", unbucketedXpRows.length);
    setOutputSafe("xpBucketUnknownCount", unknownBucketXpRows.length);

    console.log(JSON.stringify({
        scriptName: CONFIG.scriptName,
        version: CONFIG.version,
        recordId,
        athleteName,
        weekLabel,
        sendMode,
        weekStartKey,
        weekEndKey,
        gradeBandText,
        recipientsCsv,
        linkedCurriculumCount: linkedCurriculumIds.length,
        expectedHomeworkCount: expectedHomeworkRows.length,
        expectedHomeworkRows,
        submissionCount: submissionRows.length,
        countedSubmissionCount: countedSubmissionRows.length,
        storedDaysLogged,
        storedTotalShots,
        calculatedDaysLogged: daysLoggedCalculated,
        calculatedTotalShots: totalShotsCalculated,
        submissionRowsDebug: submissionRows.map(row => ({
            id: row.id,
            dateKey: row.dateKey,
            dateLabel: row.dateLabel,
            shots: row.shots,
            countThis: row.countThis,
            displayedXp: row.displayedXp,
        })),
        shootingBaseXp,
        shootingDisplayXp,
        homeworkDisplayXp,
        zoomDisplayXp,
        videoDisplayXp,
        streakDisplayXp,
        thresholdDisplayXp,
        manualBonusXp,
        otherXp,
        storedWeeklyXp,
        calculatedWeeklyXp,
        weeklyXpForEmail,
        xpEventCount: xpRows.length,
        xpBucketSummary,
        unbucketedXpEventIds: unbucketedXpRows.map(row => row.id),
        unknownBucketXpEvents: unknownBucketXpRows.map(row => ({
            id: row.id,
            bucketKey: row.bucketKey,
            source: row.source,
            points: row.points,
        })),
        thresholdRulesFound: {
            100: Boolean(thresholdRulesByPercent[100]),
            125: Boolean(thresholdRulesByPercent[125]),
            150: Boolean(thresholdRulesByPercent[150]),
        },
        thresholdDetailObjects,
    }, null, 2));
}

await main();

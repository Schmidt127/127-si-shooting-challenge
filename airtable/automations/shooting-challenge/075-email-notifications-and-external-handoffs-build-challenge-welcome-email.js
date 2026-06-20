/*
Automation: 075 - Email, Notifications, and External Handoffs - Build Challenge Welcome Email
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: Production Copy
Last Synced From Airtable: 2026-06-20

Purpose:
To be confirmed from production script.

Trigger:
To be confirmed from Airtable automation.

Important Tables:
To be confirmed from production script.

Important Fields:
To be confirmed from production script.

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy.
*/

/************************************************************
 * 075 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Build Challenge Welcome Email
 *
 * Version: v3.0
 * Date Written: 2026-05-29
 *
 * PURPOSE
 * - Runs from one Enrollments record.
 * - Reads the linked Program Instance - Synced record.
 * - Builds a branded parent welcome email for the challenge/program.
 * - Writes the generated subject and HTML back to the Enrollment.
 * - Sets Welcome Email Status to Ready.
 * - Clears Welcome Email Error on success.
 * - Optionally posts the generated email package to Make.com when a webhook URL is provided.
 *
 * IMPORTANT DESIGN RULE
 * - This automation BUILDS the welcome email package.
 * - It does not mark the welcome email as Sent.
 * - A separate Make/Gmail workflow should handle actual sending and final sent writeback.
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 075 - Email, Notifications, and External Handoffs - Build Challenge Welcome Email
 *
 * TRIGGER TABLE
 * - Enrollments
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * REQUIRED TRIGGER CONDITIONS
 * - Program Instance is not empty
 * - Parent Email is not empty
 * - Parent Email Subject is empty
 * - Parent Email HTML is empty
 * - Welcome Email Status is not Ready
 * - Welcome Email Status is not Sent
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Enrollment record
 *
 * OPTIONAL INPUT VARIABLES
 * - runMode = TEST or LIVE
 * - emailVersion = v1 or v2
 * - webhookUrl = optional Make.com webhook URL
 *
 * PRIMARY TABLES USED
 * - Enrollments
 * - Program Instance - Synced
 *
 * OUTPUT / WRITEBACK FIELDS ON ENROLLMENTS
 * - Parent Email Subject = generated subject
 * - Parent Email HTML = generated HTML
 * - Welcome Email Status = Ready
 * - Welcome Email Error = cleared on success / populated on error
 *
 * SAFETY NOTES
 * - This script blocks rebuilds for records already marked Ready or Sent.
 * - This script validates Program Instance and Parent Email before building.
 * - Optional fields are checked before use.
 * - Single-select values are validated against available choices.
 * - Webhook posting is optional; if webhookUrl is blank, the script only builds the email package.
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: EASY-EDIT VARIABLES
   ========================================================= */

const ENROLLMENTS_TABLE = "Enrollments";
const PROGRAM_INSTANCE_TABLE = "Program Instance - Synced";

const TIME_ZONE = "America/Denver";

const RUN_MODE_TEST = "TEST";
const RUN_MODE_LIVE = "LIVE";

const EMAIL_VERSION_V1 = "v1";
const EMAIL_VERSION_V2 = "v2";

const DEFAULT_RUN_MODE = RUN_MODE_TEST;
const DEFAULT_EMAIL_VERSION = EMAIL_VERSION_V1;

const TEST_RECIPIENT = "mschmidt@fairfield.k12.mt.us";

const BRAND = {
    name: "127 Sports Intensity",
    tagline: "Educational Athletics",
    primary: "#0034B7",
    accent: "#FF8B00",
    background: "#F2F2F2",
    card: "#FFFFFF",
    text: "#1F2937",
    muted: "#64748B",
    border: "#D9DDE8",
    maxWidth: "680px",
};

const CONTACT = {
    replyTo: "mschmidt@fairfield.k12.mt.us",
    signName: "Mike Schmidt",
    signRole: "Founder - 127 Sports Intensity",
    signContact: "406-590-2677 (Text only)",
};

const LOGO_DRIVE_FILE_ID = "1FEOBMUQC0tKd8Q9Pp0nhTBdub144ne0J";
const FALLBACK_BANNER_DRIVE_FILE_ID = "1TRBKaX4vBDV3dLSFk0uWx4-VI3rJRb-T";

const WEBHOOK_TIMEOUT_MS = 25000;

/* ---------- Enrollments fields ---------- */

const E = {
    athleteFirstName: "Athlete First Name",
    athleteLastName: "Athlete Last Name",
    fullAthleteName: "Full Athlete Name",

    parentFirstName: "Parent First Name",
    parentLastName: "Parent Last Name",
    parentEmail: "Parent Email",
    parentEmailCleaned: "Parent Email - Cleaned",

    grade: "Grade",
    gender: "Gender",
    state: "State",
    schoolYear: "School Year",
    registeredAt: "Registered At",

    schoolNameLookup: "School Name Lookup",
    schoolMascotLookup: "School Mascot Lookup",

    programInstance: "Program Instance",

    totalShotsSubmitted: "Total Shots Submitted",
    totalMakesSubmitted: "Total Makes Submitted",
    overallFgPct: "Overall FG %",
    overall2PtPct: "Overall 2PT %",
    overall3PtPct: "Overall 3PT %",
    overallFtPct: "Overall FT %",

    parentEmailSubject: "Parent Email Subject",
    parentEmailHtml: "Parent Email HTML",
    welcomeEmailStatus: "Welcome Email Status",
    welcomeEmailError: "Welcome Email Error",
    welcomeEmailSentAt: "Welcome Email Sent At",
};

/* ---------- Program Instance - Synced fields ---------- */

const PI = {
    name: "Name - Program Instance",
    programLinked: "Program - Linked",
    schoolYearLinked: "School Year - Linked",
    startDate: "Start Date",
    endDate: "End Date",
    registrationOpen: "Registration Open",
    registrationCloses: "Registration Closes",
    status: "Status",
    cost: "Cost",
    season: "Season",
    registrationRequired: "Registration Required",

    priceEarlyBird: "Price - Early Bird",
    deadlineEarlyBird: "Deadline - Early Bird",
    priceRegular: "Price - Regular",
    deadlineRegular: "Deadline - Regular Price",
    priceLate: "Price - Late",

    description: "Description",
    coverImage: "Cover Image",
    programCode: "Program Code",
    registrationUrl: "Registration URL",
    dailySubmissionUrl: "Daily Submission URL",
    welcomeWebsiteUrl: "Welcome - Website URL",
    welcomeSubject: "Welcome - Subject Line",
    welcomeIntro: "Welcome - Intro Note",
    welcomeWhy: "Why This Matters",
};

/* ---------- Status values ---------- */

const STATUS_READY = "Ready";
const STATUS_SENT = "Sent";
const STATUS_ERROR = "Error";

/* =========================================================
   SECTION 2: INPUTS
   ========================================================= */

const cfg = input.config();

const recordId = String(cfg.recordId || "").trim();

if (!recordId) {
    throw new Error("Missing required input: recordId");
}

function normalizeRunMode(value) {
    const raw = String(value || "").trim().toLowerCase();

    if (["live", "l", "real", "send", "parent"].includes(raw)) {
        return RUN_MODE_LIVE;
    }

    if (["test", "t", "preview", "practice", "draft"].includes(raw)) {
        return RUN_MODE_TEST;
    }

    return DEFAULT_RUN_MODE;
}

function normalizeEmailVersion(value) {
    const raw = String(value || "").trim().toLowerCase();

    if (raw === EMAIL_VERSION_V2) {
        return EMAIL_VERSION_V2;
    }

    return EMAIL_VERSION_V1;
}

const runMode = normalizeRunMode(cfg.runMode || DEFAULT_RUN_MODE);
const emailVersion = normalizeEmailVersion(cfg.emailVersion || DEFAULT_EMAIL_VERSION);
const webhookUrl = String(cfg.webhookUrl || "").trim();

/* =========================================================
   SECTION 3: TABLE REFERENCES
   ========================================================= */

const enrollmentsTable = base.getTable(ENROLLMENTS_TABLE);
const programInstanceTable = base.getTable(PROGRAM_INSTANCE_TABLE);

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

function getRaw(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return null;
    return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
    if (!record || !fieldExists(table, fieldName)) return "";
    return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (typeof raw === "number" && Number.isFinite(raw)) {
        return raw;
    }

    const text = String(raw ?? "")
        .replace(/[$,%]/g, "")
        .replace(/,/g, "")
        .trim();

    if (!text) return null;

    const n = Number(text);

    return Number.isFinite(n) ? n : null;
}

function getLinkedIds(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);

    if (!Array.isArray(raw)) return [];

    return raw
        .map(item => item?.id)
        .filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
    const ids = getLinkedIds(record, table, fieldName);
    return ids[0] || "";
}

function firstNonBlank(...values) {
    for (const value of values) {
        const text = String(value ?? "").trim();

        if (text) return text;
    }

    return "";
}

function cleanEmailList(value) {
    const emails = String(value || "")
        .split(/[,\n;]+/)
        .map(item => item.trim().toLowerCase())
        .filter(Boolean);

    return [...new Set(emails)].join(",");
}

function normalizeUrl(value) {
    const text = String(value || "").trim();

    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    if (/^mailto:/i.test(text)) return text;
    if (/^www\./i.test(text)) return `https://${text}`;

    return text;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function linkifyEscapedText(escapedText) {
    return String(escapedText || "").replace(
        /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g,
        match => {
            const href = normalizeUrl(match);

            return `<a href="${escapeHtml(href)}" style="color:${BRAND.primary};text-decoration:underline;">${escapeHtml(match)}</a>`;
        }
    );
}

function textToHtml(value) {
    const raw = String(value || "")
        .replace(/\r\n/g, "\n")
        .trim();

    if (!raw) return "";

    const paragraphs = raw
        .split(/\n\s*\n/g)
        .map(part => part.trim())
        .filter(Boolean);

    return paragraphs.map(paragraph => {
        const lines = paragraph
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);

        const bulletLines = lines.filter(line =>
            line.startsWith("•") ||
            line.startsWith("- ") ||
            line.startsWith("* ") ||
            /^[0-9]+[.)]\s+/.test(line)
        );

        if (lines.length >= 2 && bulletLines.length >= Math.ceil(lines.length / 2)) {
            const items = lines.map(line => {
                const cleaned = line
                    .replace(/^•\s*/, "")
                    .replace(/^-+\s*/, "")
                    .replace(/^\*\s*/, "")
                    .replace(/^[0-9]+[.)]\s+/, "")
                    .trim();

                return `<li style="margin:0 0 6px 0;">${linkifyEscapedText(escapeHtml(cleaned))}</li>`;
            }).join("");

            return `<ul style="margin:8px 0 0 18px;padding:0;line-height:1.5;">${items}</ul>`;
        }

        const escaped = escapeHtml(paragraph).replace(/\n/g, "<br>");
        return `<p style="margin:0 0 10px 0;line-height:1.5;">${linkifyEscapedText(escaped)}</p>`;
    }).join("");
}

function formatDate(value) {
    if (!value) return "";

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-US", {
        timeZone: TIME_ZONE,
        month: "long",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

function formatDateTime(value) {
    if (!value) return "";

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-US", {
        timeZone: TIME_ZONE,
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

function formatMoney(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "";

    return n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
    });
}

function formatPercentFromDecimal(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "";

    if (n > 1) {
        return `${n.toFixed(1)}%`;
    }

    return `${(n * 100).toFixed(1)}%`;
}

function buildDateRange(startRaw, endRaw) {
    const start = formatDate(startRaw);
    const end = formatDate(endRaw);

    if (start && end) return `${start} - ${end}`;
    return start || end || "";
}

function firstAttachmentUrl(value) {
    if (!value) return "";

    if (Array.isArray(value)) {
        for (const item of value) {
            const found = firstAttachmentUrl(item);
            if (found) return found;
        }

        return "";
    }

    if (typeof value === "object" && value.url) {
        return String(value.url).trim();
    }

    return "";
}

function getFirstAttachmentUrl(record, table, fieldName) {
    return firstAttachmentUrl(getRaw(record, table, fieldName));
}

function driveImageUrl(fileId) {
    const text = String(fileId || "").trim();

    if (!text) return "";

    return `https://lh3.googleusercontent.com/d/${encodeURIComponent(text)}`;
}

function buildSingleSelectValue(table, fieldName, optionName) {
    if (!fieldExists(table, fieldName)) return optionName;

    const field = table.getField(fieldName);

    if (field.type !== "singleSelect") {
        return optionName;
    }

    const choices = field?.options?.choices || [];

    const match = choices.find(choice =>
        String(choice?.name || "").trim().toLowerCase() === String(optionName || "").trim().toLowerCase()
    );

    if (!match) {
        throw new Error(`Missing single-select option "${optionName}" in ${table.name}.${fieldName}`);
    }

    return { id: match.id };
}

function addIfFieldExists(payload, table, fieldName, value) {
    if (!fieldExists(table, fieldName)) return;
    if (value === undefined || value === null) return;

    payload[fieldName] = value;
}

function setOutputSafe(name, value) {
    try {
        output.set(name, value);
    } catch {
        // Ignore output mapping errors.
    }
}

async function writeEnrollmentUpdates(fields) {
    const safeFields = {};

    for (const [fieldName, value] of Object.entries(fields)) {
        if (fieldExists(enrollmentsTable, fieldName)) {
            safeFields[fieldName] = value;
        }
    }

    if (Object.keys(safeFields).length) {
        await enrollmentsTable.updateRecordAsync(recordId, safeFields);
    }
}

async function writeError(message) {
    const fields = {};

    if (fieldExists(enrollmentsTable, E.welcomeEmailStatus)) {
        fields[E.welcomeEmailStatus] = buildSingleSelectValue(
            enrollmentsTable,
            E.welcomeEmailStatus,
            STATUS_ERROR
        );
    }

    if (fieldExists(enrollmentsTable, E.welcomeEmailError)) {
        fields[E.welcomeEmailError] = String(message || "");
    }

    await writeEnrollmentUpdates(fields);
}

async function postJsonWithTimeout(url, payload) {
    const request = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    };

    if (typeof remoteFetchAsync === "function") {
        return await remoteFetchAsync(url, request);
    }

    if (typeof fetch === "function") {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

        try {
            return await fetch(url, {
                ...request,
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }
    }

    throw new Error("No supported HTTP method is available in this Airtable automation environment.");
}

/* =========================================================
   SECTION 4B: PROGRAM COPY
   ========================================================= */

function programCopy(programCode) {
    const code = String(programCode || "").trim().toLowerCase();

    if (code === "shooting") {
        return {
            label: "Shooting Challenge",
            dailyAction: "submit shot totals",
            growthLine: "build shooting habits through consistent repetition and daily accountability",
            nextLine: "Families will use the daily submission link to report shooting work and keep progress current throughout the challenge.",
        };
    }

    if (code === "dribble") {
        return {
            label: "Dribbling Challenge",
            dailyAction: "submit daily dribbling work",
            growthLine: "build ball-handling habits through steady daily work and accountability",
            nextLine: "Families will use the daily submission link to report dribbling work and keep progress current throughout the challenge.",
        };
    }

    if (code === "freethrow") {
        return {
            label: "Free Throw Challenge",
            dailyAction: "submit free throw totals",
            growthLine: "build consistency and confidence through repeated free throw practice",
            nextLine: "Families will use the daily submission link to report free throw work and keep progress current throughout the challenge.",
        };
    }

    if (code === "character") {
        return {
            label: "Character Challenge",
            dailyAction: "follow the weekly activities",
            growthLine: "build habits, responsibility, and personal growth through intentional participation",
            nextLine: "Families should review the program links, watch for updates, and help athletes stay engaged with each step of the challenge.",
        };
    }

    return {
        label: "Challenge",
        dailyAction: "submit progress",
        growthLine: "build habits, confidence, and accountability through steady participation",
        nextLine: "Families will use the program links and reporting process to keep progress current throughout the challenge.",
    };
}

/* =========================================================
   SECTION 5: EMAIL HTML HELPERS
   ========================================================= */

function renderButton(label, url, backgroundColor = BRAND.primary) {
    const href = normalizeUrl(url);

    if (!href) return "";

    return `
        <a href="${escapeHtml(href)}"
           style="display:inline-block;background:${backgroundColor};color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;line-height:1.2;padding:11px 15px;border-radius:10px;margin:4px 8px 4px 0;">
            ${escapeHtml(label)}
        </a>
    `;
}

function renderInfoTable(rows) {
    const filtered = rows.filter(row => String(row?.value || "").trim());

    if (!filtered.length) return "";

    return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
            ${filtered.map(row => `
                <tr>
                    <td style="padding:5px 0;font-size:12px;font-weight:800;color:${BRAND.text};width:155px;vertical-align:top;">
                        ${escapeHtml(row.label)}
                    </td>
                    <td style="padding:5px 0;font-size:12px;color:${BRAND.text};vertical-align:top;">
                        ${escapeHtml(row.value)}
                    </td>
                </tr>
            `).join("")}
        </table>
    `;
}

function renderCard(title, bodyHtml) {
    if (!String(bodyHtml || "").trim()) return "";

    return `
        <div style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;padding:16px 18px;margin:0 0 14px 0;">
            <div style="font-size:16px;font-weight:900;color:${BRAND.accent};margin:0 0 10px 0;line-height:1.2;">
                ${escapeHtml(title)}
            </div>
            <div style="font-size:13px;color:${BRAND.text};line-height:1.45;">
                ${bodyHtml}
            </div>
        </div>
    `;
}

function buildEmailHtml({
    parentFirstName,
    athleteName,
    programName,
    programLabel,
    programDescriptionHtml,
    welcomeIntroHtml,
    whyThisMattersHtml,
    nextStepText,
    dateRange,
    registrationWindow,
    costDisplay,
    pricingDisplay,
    season,
    status,
    registrationUrl,
    dailySubmissionUrl,
    websiteUrl,
    coverImageUrl,
    schoolName,
    grade,
    gender,
    schoolYear,
    statsRows,
    emailVersion,
    runMode,
}) {
    const logoUrl = driveImageUrl(LOGO_DRIVE_FILE_ID);
    const fallbackBannerUrl = driveImageUrl(FALLBACK_BANNER_DRIVE_FILE_ID);
    const bannerUrl = coverImageUrl || fallbackBannerUrl;

    const versionOneHeader = `
        <div style="background:${BRAND.primary};color:#ffffff;border-radius:18px;padding:20px 22px;margin:0 0 14px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="vertical-align:middle;padding:0 12px 0 0;">
                        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;font-weight:800;opacity:.95;">
                            ${escapeHtml(BRAND.name)}
                        </div>
                        <div style="font-size:23px;font-weight:900;line-height:1.15;margin:4px 0 4px 0;">
                            Welcome to ${escapeHtml(programLabel)}
                        </div>
                        <div style="font-size:13px;line-height:1.35;opacity:.96;">
                            ${escapeHtml(BRAND.tagline)}
                        </div>
                    </td>
                    <td style="width:76px;vertical-align:middle;text-align:right;">
                        ${logoUrl ? `
                            <div style="background:#ffffff;border-radius:999px;width:72px;height:72px;display:inline-block;text-align:center;line-height:72px;overflow:hidden;">
                                <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(BRAND.name)}" style="max-width:58px;max-height:58px;vertical-align:middle;">
                            </div>
                        ` : ""}
                    </td>
                </tr>
            </table>
        </div>
    `;

    const versionTwoHeader = `
        <div style="background:${BRAND.primary};border-radius:18px;overflow:hidden;margin:0 0 14px 0;color:#ffffff;">
            ${bannerUrl ? `
                <div style="background:#ffffff;text-align:center;">
                    <img src="${escapeHtml(bannerUrl)}" alt="${escapeHtml(programLabel)}" style="display:block;width:100%;max-height:220px;object-fit:cover;border:0;">
                </div>
            ` : ""}
            <div style="padding:18px 20px;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;font-weight:800;opacity:.95;">
                    ${escapeHtml(BRAND.name)}
                </div>
                <div style="font-size:23px;font-weight:900;line-height:1.15;margin:4px 0;">
                    Welcome to ${escapeHtml(programLabel)}
                </div>
                <div style="font-size:13px;line-height:1.35;opacity:.96;">
                    ${escapeHtml(programName || BRAND.tagline)}
                </div>
            </div>
        </div>
    `;

    const helloHtml = `
        <p style="margin:0 0 10px 0;">Hello ${escapeHtml(parentFirstName || "there")},</p>
        <p style="margin:0 0 10px 0;">
            Thank you for registering ${escapeHtml(athleteName || "your athlete")} for ${escapeHtml(programName || programLabel)}.
        </p>
        <p style="margin:0;">
            This welcome message includes the important program details and links your family may need.
        </p>
    `;

    const summaryHtml = renderInfoTable([
        { label: "Athlete", value: athleteName },
        { label: "Program", value: programName || programLabel },
        { label: "Program Type", value: programLabel },
        { label: "School Year", value: schoolYear },
        { label: "Grade", value: grade },
        { label: "Gender", value: gender },
        { label: "School", value: schoolName },
        { label: "Dates", value: dateRange },
        { label: "Season", value: season },
        { label: "Status", value: status },
        { label: "Registration Window", value: registrationWindow },
        { label: "Cost", value: costDisplay },
        { label: "Pricing", value: pricingDisplay },
    ]);

    const linkButtonsHtml = [
        renderButton("Open Daily Submission Form", dailySubmissionUrl, BRAND.primary),
        renderButton("Open Program Website", websiteUrl, BRAND.accent),
        renderButton("Open Registration Form", registrationUrl, BRAND.primary),
    ].join("");

    const linksHtml = linkButtonsHtml || `
        <p style="margin:0;color:${BRAND.muted};">
            No program links were available on this Program Instance record yet.
        </p>
    `;

    const statsHtml = statsRows.length
        ? renderInfoTable(statsRows)
        : "";

    const closingHtml = `
        <p style="margin:0 0 10px 0;">
            ${escapeHtml(CONTACT.signName)}<br>
            ${escapeHtml(CONTACT.signRole)}<br>
            ${escapeHtml(CONTACT.signContact)}
        </p>
        <p style="margin:0;color:${BRAND.muted};font-size:12px;">
            Reply to this email if you have questions or need help with the registration or submission process.
        </p>
    `;

    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(programLabel)} Welcome</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.background};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
    <div style="background:${BRAND.background};padding:18px 10px;">
        <div style="max-width:${BRAND.maxWidth};margin:0 auto;">
            ${emailVersion === EMAIL_VERSION_V2 ? versionTwoHeader : versionOneHeader}

            ${runMode === RUN_MODE_TEST ? `
                <div style="background:#FFF7ED;border:1px solid #FED7AA;color:#7C2D12;border-radius:14px;padding:12px 14px;margin:0 0 14px 0;font-size:13px;font-weight:800;">
                    TEST MODE - This email package was generated for review.
                </div>
            ` : ""}

            ${renderCard("Welcome", helloHtml)}
            ${welcomeIntroHtml ? renderCard("Program Note", welcomeIntroHtml) : ""}
            ${renderCard("Registration Summary", summaryHtml)}
            ${programDescriptionHtml ? renderCard("About the Program", programDescriptionHtml) : ""}
            ${whyThisMattersHtml ? renderCard("Why This Matters", whyThisMattersHtml) : ""}
            ${renderCard("Important Links", linksHtml)}
            ${statsHtml ? renderCard("Current Progress Snapshot", statsHtml) : ""}
            ${renderCard("Next Step", `<p style="margin:0;">${escapeHtml(nextStepText || "")}</p>`)}
            ${renderCard("Questions", closingHtml)}

            <div style="background:${BRAND.primary};color:#ffffff;border-radius:16px;padding:14px 18px;margin:0;font-size:12px;line-height:1.35;">
                <strong>${escapeHtml(BRAND.name)}</strong><br>
                ${escapeHtml(BRAND.tagline)}
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();
}

/* =========================================================
   SECTION 6: MAIN
   ========================================================= */

let enrollmentRecord = null;

try {
    enrollmentRecord = await enrollmentsTable.selectRecordAsync(recordId);

    if (!enrollmentRecord) {
        throw new Error(`Enrollment record not found: ${recordId}`);
    }

    const existingSubject = getText(enrollmentRecord, enrollmentsTable, E.parentEmailSubject);
    const existingHtml = getText(enrollmentRecord, enrollmentsTable, E.parentEmailHtml);
    const existingStatus = getText(enrollmentRecord, enrollmentsTable, E.welcomeEmailStatus);

    if (existingStatus.toLowerCase() === STATUS_SENT.toLowerCase()) {
        throw new Error("Welcome Email Status is already Sent. Build blocked.");
    }

    if (existingStatus.toLowerCase() === STATUS_READY.toLowerCase()) {
        throw new Error("Welcome Email Status is already Ready. Build blocked.");
    }

    if (existingSubject || existingHtml) {
        throw new Error("Parent Email Subject or Parent Email HTML is already filled. Build blocked to prevent overwrite.");
    }

    const programInstanceId = getFirstLinkedId(
        enrollmentRecord,
        enrollmentsTable,
        E.programInstance
    );

    if (!programInstanceId) {
        throw new Error("Enrollment is missing Program Instance.");
    }

    const programInstanceRecord = await programInstanceTable.selectRecordAsync(programInstanceId);

    if (!programInstanceRecord) {
        throw new Error(`Program Instance record not found: ${programInstanceId}`);
    }

    const parentEmail = cleanEmailList(
        firstNonBlank(
            getText(enrollmentRecord, enrollmentsTable, E.parentEmailCleaned),
            getText(enrollmentRecord, enrollmentsTable, E.parentEmail)
        )
    );

    if (!parentEmail) {
        throw new Error("Enrollment is missing Parent Email.");
    }

    const parentFirstName = getText(enrollmentRecord, enrollmentsTable, E.parentFirstName);

    const athleteName = firstNonBlank(
        getText(enrollmentRecord, enrollmentsTable, E.fullAthleteName),
        `${getText(enrollmentRecord, enrollmentsTable, E.athleteFirstName)} ${getText(enrollmentRecord, enrollmentsTable, E.athleteLastName)}`.trim(),
        "your athlete"
    );

    const grade = getText(enrollmentRecord, enrollmentsTable, E.grade);
    const gender = getText(enrollmentRecord, enrollmentsTable, E.gender);

    const schoolYear = firstNonBlank(
        getText(enrollmentRecord, enrollmentsTable, E.schoolYear),
        getText(programInstanceRecord, programInstanceTable, PI.schoolYearLinked)
    );

    const schoolName = getText(enrollmentRecord, enrollmentsTable, E.schoolNameLookup);

    const programName = firstNonBlank(
        getText(programInstanceRecord, programInstanceTable, PI.name),
        getText(programInstanceRecord, programInstanceTable, PI.programLinked),
        "Challenge Program"
    );

    const programCode = getText(programInstanceRecord, programInstanceTable, PI.programCode);
    const programCopyValue = programCopy(programCode);
    const programLabel = programCopyValue.label;

    const dateRange = buildDateRange(
        getRaw(programInstanceRecord, programInstanceTable, PI.startDate),
        getRaw(programInstanceRecord, programInstanceTable, PI.endDate)
    );

    const registrationWindow = buildDateRange(
        getRaw(programInstanceRecord, programInstanceTable, PI.registrationOpen),
        getRaw(programInstanceRecord, programInstanceTable, PI.registrationCloses)
    );

    const costDisplay = formatMoney(
        getNumber(programInstanceRecord, programInstanceTable, PI.cost)
    );

    const earlyPrice = formatMoney(getNumber(programInstanceRecord, programInstanceTable, PI.priceEarlyBird));
    const regularPrice = formatMoney(getNumber(programInstanceRecord, programInstanceTable, PI.priceRegular));
    const latePrice = formatMoney(getNumber(programInstanceRecord, programInstanceTable, PI.priceLate));

    const earlyDeadline = formatDate(getRaw(programInstanceRecord, programInstanceTable, PI.deadlineEarlyBird));
    const regularDeadline = formatDate(getRaw(programInstanceRecord, programInstanceTable, PI.deadlineRegular));

    const pricingParts = [];

    if (earlyPrice) {
        pricingParts.push(`Early Bird: ${earlyPrice}${earlyDeadline ? ` through ${earlyDeadline}` : ""}`);
    }

    if (regularPrice) {
        pricingParts.push(`Regular: ${regularPrice}${regularDeadline ? ` through ${regularDeadline}` : ""}`);
    }

    if (latePrice) {
        pricingParts.push(`Late: ${latePrice}`);
    }

    const pricingDisplay = pricingParts.join(" | ");

    const season = getText(programInstanceRecord, programInstanceTable, PI.season);
    const status = getText(programInstanceRecord, programInstanceTable, PI.status);

    const registrationUrl = getText(programInstanceRecord, programInstanceTable, PI.registrationUrl);
    const dailySubmissionUrl = getText(programInstanceRecord, programInstanceTable, PI.dailySubmissionUrl);
    const websiteUrl = getText(programInstanceRecord, programInstanceTable, PI.welcomeWebsiteUrl);

    const coverImageUrl = getFirstAttachmentUrl(programInstanceRecord, programInstanceTable, PI.coverImage);

    const programDescriptionHtml = textToHtml(
        getText(programInstanceRecord, programInstanceTable, PI.description)
    );

    const welcomeIntroHtml = textToHtml(
        getText(programInstanceRecord, programInstanceTable, PI.welcomeIntro)
    );

    const whyThisMattersHtml = textToHtml(
        firstNonBlank(
            getText(programInstanceRecord, programInstanceTable, PI.welcomeWhy),
            `This program is designed to help athletes ${programCopyValue.growthLine}.`
        )
    );

    const totalShots = getNumber(enrollmentRecord, enrollmentsTable, E.totalShotsSubmitted);
    const totalMakes = getNumber(enrollmentRecord, enrollmentsTable, E.totalMakesSubmitted);
    const fgPct = getNumber(enrollmentRecord, enrollmentsTable, E.overallFgPct);
    const twoPtPct = getNumber(enrollmentRecord, enrollmentsTable, E.overall2PtPct);
    const threePtPct = getNumber(enrollmentRecord, enrollmentsTable, E.overall3PtPct);
    const ftPct = getNumber(enrollmentRecord, enrollmentsTable, E.overallFtPct);

    const statsRows = [
        totalShots !== null ? { label: "Total Shots Submitted", value: String(totalShots) } : null,
        totalMakes !== null ? { label: "Total Makes Submitted", value: String(totalMakes) } : null,
        fgPct !== null ? { label: "Overall FG %", value: formatPercentFromDecimal(fgPct) } : null,
        twoPtPct !== null ? { label: "Overall 2PT %", value: formatPercentFromDecimal(twoPtPct) } : null,
        threePtPct !== null ? { label: "Overall 3PT %", value: formatPercentFromDecimal(threePtPct) } : null,
        ftPct !== null ? { label: "Overall FT %", value: formatPercentFromDecimal(ftPct) } : null,
    ].filter(Boolean);

    const customSubject = getText(programInstanceRecord, programInstanceTable, PI.welcomeSubject);

    const subject = firstNonBlank(
        customSubject,
        `Welcome to ${programLabel} - ${athleteName}`
    );

    const html = buildEmailHtml({
        parentFirstName,
        athleteName,
        programName,
        programLabel,
        programDescriptionHtml,
        welcomeIntroHtml,
        whyThisMattersHtml,
        nextStepText: programCopyValue.nextLine,
        dateRange,
        registrationWindow,
        costDisplay,
        pricingDisplay,
        season,
        status,
        registrationUrl,
        dailySubmissionUrl,
        websiteUrl,
        coverImageUrl,
        schoolName,
        grade,
        gender,
        schoolYear,
        statsRows,
        emailVersion,
        runMode,
    });

    const updateFields = {};

    addIfFieldExists(updateFields, enrollmentsTable, E.parentEmailSubject, subject);
    addIfFieldExists(updateFields, enrollmentsTable, E.parentEmailHtml, html);

    if (fieldExists(enrollmentsTable, E.welcomeEmailStatus)) {
        updateFields[E.welcomeEmailStatus] = buildSingleSelectValue(
            enrollmentsTable,
            E.welcomeEmailStatus,
            STATUS_READY
        );
    }

    addIfFieldExists(updateFields, enrollmentsTable, E.welcomeEmailError, "");

    await writeEnrollmentUpdates(updateFields);

    const sendTo = runMode === RUN_MODE_TEST ? TEST_RECIPIENT : parentEmail;

    const webhookPayload = {
        automationNumber: "075",
        automationName: "075 - Email, Notifications, and External Handoffs - Build Challenge Welcome Email",
        runMode,
        sendMode: runMode.toLowerCase(),
        emailVersion,

        recordId,
        enrollmentId: recordId,
        programInstanceId,

        subject,
        html,
        sendTo,
        parentEmail,
        testRecipient: TEST_RECIPIENT,

        athleteName,
        parentFirstName,
        programName,
        programLabel,

        dailySubmissionUrl,
        registrationUrl,
        websiteUrl,

        replyTo: CONTACT.replyTo,
        builtAt: new Date().toISOString(),
    };

    let webhookStatus = "";
    let webhookResponse = "";

    if (webhookUrl) {
        const response = await postJsonWithTimeout(webhookUrl, webhookPayload);
        webhookStatus = String(response.status || "");
        webhookResponse = await response.text();

        if (!response.ok) {
            throw new Error(`Webhook failed. Status=${webhookStatus}. Response=${webhookResponse}`);
        }
    }

    setOutputSafe("statusOut", "success");
    setOutputSafe("recordId", recordId);
    setOutputSafe("programInstanceId", programInstanceId);
    setOutputSafe("runMode", runMode);
    setOutputSafe("sendMode", runMode.toLowerCase());
    setOutputSafe("emailVersion", emailVersion);
    setOutputSafe("subject", subject);
    setOutputSafe("html", html);
    setOutputSafe("sendTo", sendTo);
    setOutputSafe("parentEmail", parentEmail);
    setOutputSafe("webhookPosted", Boolean(webhookUrl));
    setOutputSafe("webhookStatus", webhookStatus);
    setOutputSafe("webhookResponse", webhookResponse);
    setOutputSafe("errorOut", "");

    console.log(JSON.stringify({
        automation: "075 - Email, Notifications, and External Handoffs - Build Challenge Welcome Email",
        version: "v3.0",
        statusOut: "success",
        recordId,
        programInstanceId,
        runMode,
        sendMode: runMode.toLowerCase(),
        emailVersion,
        subject,
        sendTo,
        parentEmail,
        webhookPosted: Boolean(webhookUrl),
        webhookStatus,
    }, null, 2));

} catch (error) {
    const message = String(error.message || error);

    await writeError(message);

    setOutputSafe("statusOut", "error");
    setOutputSafe("recordId", recordId);
    setOutputSafe("runMode", runMode);
    setOutputSafe("sendMode", runMode.toLowerCase());
    setOutputSafe("emailVersion", emailVersion);
    setOutputSafe("errorOut", message);

    throw error;
}

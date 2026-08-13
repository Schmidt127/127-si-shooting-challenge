/*
PKG-036 read-only progression/configuration integrity audit.

Run in the Airtable Scripting Extension. This script never writes records.
It classifies findings as error, warning, formula_unsettled, or inaccessible.
*/

const TABLES = {
    enrollments: "Enrollments",
    levels: "Levels",
    gateRules: "Level Gate Rules",
};

const F = {
    active: "Active?",
    xp: "Lifetime XP Total",
    current: "Current Level",
    next: "Next Level",
    gateRule: "Level Gate Rule",
    status: "Level Status",
    recalc: "Level Recalc Needed?",
    queued: "Progression Last Queued Signature",
    reconciled: "Progression Last Reconciled Signature",
    manualXp: "Lifetime XP Manual Adjustments",
    schoolYear: "School Year",
    levelName: "Level Name",
    threshold: "XP Required (Cumulative)",
    levelLink: "Level",
    gateActive: "Version Active?",
    gateEnabled: "Gate Enabled?",
    gateYear: "School Year / Rule Set",
    minimumSubmissions: "Minimum Submissions",
    minimumHomework: "Minimum Homework Completions",
    minimumVideos: "Minimum Video Submissions",
    minimumZoomMeetings: "Minimum Zoom Meetings",
    minimumStreakDays: "Minimum Streak Days",
};

function text(record, field) {
    try {
        return String(record.getCellValueAsString(field) || "").trim();
    } catch {
        return "";
    }
}

function number(record, field) {
    const value = record.getCellValue(field);
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function bool(record, field) {
    const value = record.getCellValue(field);
    return value === true || value === 1 || value === "1";
}

function ids(record, field) {
    try {
        const value = record.getCellValue(field);
        return Array.isArray(value) ? value.map((item) => item?.id).filter(Boolean) : [];
    } catch {
        return [];
    }
}

function finding(severity, code, recordId, detail, classification = severity) {
    return { severity, code, recordId, detail, classification };
}

function addFieldFindings(findings, table, fields) {
    for (const field of fields) {
        try {
            table.getField(field);
        } catch {
            findings.push(
                finding("error", "missing_required_field", table.name, `${table.name}.${field} is missing.`, "inaccessible")
            );
        }
    }
}

async function main() {
    const findings = [];
    const levelsTable = base.getTable(TABLES.levels);
    const gateRulesTable = base.getTable(TABLES.gateRules);
    const enrollmentsTable = base.getTable(TABLES.enrollments);

    addFieldFindings(findings, levelsTable, [F.levelName, F.threshold, F.active]);
    addFieldFindings(findings, gateRulesTable, [
        F.levelLink, F.gateActive, F.gateEnabled, F.gateYear,
        F.minimumSubmissions, F.minimumHomework, F.minimumVideos,
        F.minimumZoomMeetings, F.minimumStreakDays,
    ]);
    addFieldFindings(findings, enrollmentsTable, [
        F.active, F.xp, F.current, F.next, F.gateRule, F.status, F.recalc,
        F.queued, F.reconciled, F.manualXp, F.schoolYear,
    ]);

    const levelsQuery = await levelsTable.selectRecordsAsync({
        fields: [F.levelName, F.threshold, F.active],
    });
    const gateQuery = await gateRulesTable.selectRecordsAsync({
        fields: [
            F.levelLink, F.gateActive, F.gateEnabled, F.gateYear,
            F.minimumSubmissions, F.minimumHomework, F.minimumVideos,
            F.minimumZoomMeetings, F.minimumStreakDays,
        ],
    });
    const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
        fields: [
            F.active, F.xp, F.current, F.next, F.gateRule, F.status, F.recalc,
            F.queued, F.reconciled, F.manualXp, F.schoolYear,
        ],
    });

    const activeLevels = levelsQuery.records.filter((record) => bool(record, F.active));
    const thresholds = new Map();
    for (const level of activeLevels) {
        const name = text(level, F.levelName);
        const threshold = number(level, F.threshold);
        if (!name) findings.push(finding("error", "active_level_missing_name", level.id, "Active Level has no Level Name."));
        if (threshold === null || threshold < 0) {
            findings.push(finding("error", "invalid_level_threshold", level.id, `Threshold is ${threshold}.`));
        } else if (thresholds.has(threshold)) {
            findings.push(finding("error", "duplicate_active_level_threshold", level.id, `Threshold ${threshold} duplicates ${thresholds.get(threshold)}.`));
        } else {
            thresholds.set(threshold, level.id);
        }
    }
    const initialCount = [...thresholds.keys()].filter((threshold) => threshold === 0).length;
    if (initialCount !== 1) findings.push(finding("error", "initial_level_configuration", "", `Expected one active 0-XP Level; found ${initialCount}.`));

    const activeGateByLevelYear = new Map();
    for (const gate of gateQuery.records) {
        if (!bool(gate, F.gateActive)) continue;
        const levelIds = ids(gate, F.levelLink);
        const year = text(gate, F.gateYear) || "Shared";
        for (const field of [
            F.minimumSubmissions,
            F.minimumHomework,
            F.minimumVideos,
            F.minimumZoomMeetings,
            F.minimumStreakDays,
        ]) {
            const raw = gate.getCellValue(field);
            const value = raw === null || raw === undefined || raw === "" ? null : Number(raw);
            if (value === null || !Number.isFinite(value) || value < 0) {
                findings.push(finding("error", "invalid_gate_numeric", gate.id, `${field} is missing, nonnumeric, or negative.`));
            }
        }
        if (levelIds.length !== 1) {
            findings.push(finding("error", "gate_rule_level_identity", gate.id, "Active gate rule must link exactly one Level."));
            continue;
        }
        const key = `${levelIds[0]}|${year}`;
        const prior = activeGateByLevelYear.get(key);
        if (prior) {
            findings.push(finding("error", "duplicate_active_gate_rule", gate.id, `Duplicate active gate for ${key}; prior=${prior}.`));
        } else {
            activeGateByLevelYear.set(key, gate.id);
        }
    }

    for (const enrollment of enrollmentQuery.records) {
        if (!bool(enrollment, F.active)) continue;
        const xp = number(enrollment, F.xp);
        if (xp === null) {
            findings.push(finding("formula_unsettled", "lifetime_xp_unsettled", enrollment.id, "Lifetime XP Total is blank/non-numeric.", "formula_unsettled"));
            continue;
        }
        if (ids(enrollment, F.current).length !== 1) findings.push(finding("error", "missing_current_level", enrollment.id, "Active Enrollment does not have exactly one Current Level."));
        if (!text(enrollment, F.status)) findings.push(finding("error", "missing_level_status", enrollment.id, "Active Enrollment has blank Level Status."));
        if (bool(enrollment, F.recalc)) findings.push(finding("warning", "recalc_pending", enrollment.id, "Level Recalc Needed? remains checked."));
        if (!text(enrollment, F.reconciled)) findings.push(finding("warning", "reconciled_signature_missing", enrollment.id, "No successful reconciliation signature is recorded."));
        const current = ids(enrollment, F.current)[0];
        const currentLevel = levelsQuery.records.find((level) => level.id === current);
        if (currentLevel && number(currentLevel, F.threshold) !== null && xp < number(currentLevel, F.threshold)) {
            findings.push(finding("error", "xp_below_current_level", enrollment.id, `XP ${xp} is below Current Level threshold ${number(currentLevel, F.threshold)}.`));
        }
    }

    const summary = {
        audit: "PKG-036 progression integrity",
        readOnly: true,
        generatedAt: new Date().toISOString(),
        counts: {
            levels: levelsQuery.records.length,
            activeLevels: activeLevels.length,
            gateRules: gateQuery.records.length,
            enrollments: enrollmentQuery.records.length,
            activeEnrollments: enrollmentQuery.records.filter((record) => bool(record, F.active)).length,
            findings: findings.length,
        },
        findings,
        productionEvidenceBoundary: "This is a read-only Airtable audit; it does not install scripts, change schema, or prove natural-trigger behavior.",
    };

    console.log(JSON.stringify(summary, null, 2));
}

await main();

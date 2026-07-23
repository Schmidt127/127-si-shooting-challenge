"use strict";

const {
  asText,
  normalizeTitle,
  normalizeUrl,
  normalizeVideoUrl,
  normalizeGradeBand,
  attachmentIds,
  contentHash,
  isPublished,
  asStringArray,
} = require("./normalize");

/**
 * Classifications:
 * - exact_duplicate
 * - probable_duplicate
 * - related_but_distinct
 * - orphan
 * - incomplete
 * - conflicting
 */

function getField(record, ...keys) {
  const fields = record.fields || record;
  for (const key of keys) {
    if (fields[key] != null && fields[key] !== "") return fields[key];
  }
  return undefined;
}

function projectRecord(record, tableHint) {
  const id = record.id || record.recordId || "";
  const title = asText(getField(record, "Name", "title", "Title"));
  const url = normalizeUrl(getField(record, "Link to Video", "videoUrl", "URL", "url"));
  const videoUrl = normalizeVideoUrl(getField(record, "Link to Video", "videoUrl", "URL", "url"));
  const gradeBand = normalizeGradeBand(
    getField(record, "Grade Band", "gradeBand", "Age Appropriate", "gradeBandLabel"),
  );
  const attachments = [
    ...attachmentIds(getField(record, "Thumbnail", "thumbnail")),
    ...attachmentIds(getField(record, "Website Image Resolved", "Display Image", "displayImage")),
    ...attachmentIds(getField(record, "Athlete Headshot - Lkp", "Athlete Headshot", "athleteHeadshot")),
  ];
  const hash = contentHash(record);
  const published = isPublished(getField(record, "OK to Publish on Softr", "Published?", "published"));
  const linkedHomework = asStringArray(
    getField(record, "Homework", "Homework links", "linkedHomeworkIds", "homeworkIds"),
  );
  const linkedLearningActivities = asStringArray(
    getField(
      record,
      "Learning Activity",
      "Learning Activities",
      "linkedLearningActivityIds",
      "learningActivityIds",
    ),
  );
  const brief = asText(getField(record, "Brief Description", "Brief Descriptions", "shortDescription"));
  const detailed = asText(
    getField(record, "Detailed Description", "detailedDescription", "description"),
  );
  const type = asText(getField(record, "Tutorial Type", "Type of Asset", "type"));

  return {
    id,
    tableHint: tableHint || record.table || "",
    title,
    normalizedTitle: normalizeTitle(title),
    url,
    videoUrl,
    gradeBand,
    attachments,
    hash,
    published,
    linkedHomework,
    linkedLearningActivities,
    brief,
    detailed,
    type,
    raw: record,
  };
}

function isIncomplete(projected) {
  const missingTitle = !projected.normalizedTitle;
  const missingMedia = !projected.url && projected.attachments.length === 0;
  const missingCopy = !projected.brief && !projected.detailed;
  return missingTitle || (missingMedia && missingCopy);
}

function shareAttachment(a, b) {
  const set = new Set(a.attachments);
  return b.attachments.some((id) => set.has(id));
}

function classifyPair(a, b) {
  const reasons = [];
  let score = 0;

  if (a.id && b.id && a.id === b.id) {
    return {
      classification: "exact_duplicate",
      confidence: 1,
      reasons: ["exact_linked_record_id"],
      score: 100,
    };
  }

  if (a.hash && b.hash && a.hash === b.hash) {
    reasons.push("content_hash");
    score += 50;
  }

  if (a.url && b.url && a.url === b.url) {
    reasons.push("canonical_url");
    score += 40;
  }

  if (a.videoUrl && b.videoUrl && a.videoUrl === b.videoUrl && !reasons.includes("canonical_url")) {
    reasons.push("normalized_video_url");
    score += 40;
  }

  if (shareAttachment(a, b)) {
    reasons.push("attachment_id");
    score += 35;
  }

  const sameTitle = a.normalizedTitle && a.normalizedTitle === b.normalizedTitle;
  if (sameTitle) {
    reasons.push("normalized_title");
    score += 15;
  }

  const bothHaveBand = Boolean(a.gradeBand && b.gradeBand);
  if (sameTitle && bothHaveBand && a.gradeBand === b.gradeBand) {
    reasons.push("title_plus_grade_band");
    score += 20;
  }
  if (sameTitle && bothHaveBand && a.gradeBand !== b.gradeBand) {
    reasons.push("same_title_different_grade_band");
    // Strong signal they are related but distinct age variants.
    return {
      classification: "related_but_distinct",
      confidence: 0.85,
      reasons,
      score,
    };
  }

  if (a.published !== b.published && score >= 40) {
    reasons.push("published_vs_unpublished_version");
  }

  const metadataDiffers =
    (a.brief && b.brief && a.brief !== b.brief) ||
    (a.detailed && b.detailed && a.detailed !== b.detailed) ||
    (a.type && b.type && a.type !== b.type);

  if (score >= 70) {
    if (metadataDiffers || (a.published !== b.published && reasons.includes("published_vs_unpublished_version"))) {
      return {
        classification: "conflicting",
        confidence: 0.8,
        reasons: [...reasons, "metadata_or_publish_conflict"],
        score,
      };
    }
    return {
      classification: "exact_duplicate",
      confidence: 0.95,
      reasons,
      score,
    };
  }

  if (score >= 40) {
    if (metadataDiffers) {
      return {
        classification: "conflicting",
        confidence: 0.7,
        reasons: [...reasons, "same_media_different_metadata"],
        score,
      };
    }
    return {
      classification: "probable_duplicate",
      confidence: 0.75,
      reasons,
      score,
    };
  }

  if (sameTitle && !a.url && !b.url) {
    return {
      classification: "related_but_distinct",
      confidence: 0.4,
      reasons: [...reasons, "title_only_insufficient_for_merge"],
      score,
    };
  }

  if (sameTitle) {
    return {
      classification: "related_but_distinct",
      reasons: [...reasons, "title_only_insufficient_for_merge"],
      confidence: 0.55,
      score,
    };
  }

  return null;
}

function detectDuplicates({ sourceRecords = [], targetRecords = [], tableHints = {} } = {}) {
  const sources = sourceRecords.map((r) => projectRecord(r, tableHints.source || "Tutorials & Assets"));
  const targets = targetRecords.map((r) => projectRecord(r, tableHints.target || "Tutorials"));

  const pairs = [];
  const matchedSourceIds = new Set();
  const matchedTargetIds = new Set();

  for (const source of sources) {
    let best = null;
    for (const target of targets) {
      const result = classifyPair(source, target);
      if (!result) continue;
      if (!best || result.score > best.score) {
        best = { source, target, ...result };
      }
    }

    if (best) {
      matchedSourceIds.add(source.id);
      matchedTargetIds.add(best.target.id);
      pairs.push({
        classification: best.classification,
        confidence: best.confidence,
        reasons: best.reasons,
        score: best.score,
        sourceId: source.id,
        targetId: best.target.id,
        sourceTitle: source.title,
        targetTitle: best.target.title,
        sourceUrl: source.url,
        targetUrl: best.target.url,
        sourcePublished: source.published,
        targetPublished: best.target.published,
        linkedHomework: source.linkedHomework,
        linkedLearningActivities: source.linkedLearningActivities,
      });
    }
  }

  const orphans = [];
  const incomplete = [];

  for (const source of sources) {
    if (isIncomplete(source)) {
      incomplete.push({
        classification: "incomplete",
        id: source.id,
        title: source.title,
        url: source.url,
        reasons: [
          !source.normalizedTitle ? "missing_title" : null,
          !source.url && source.attachments.length === 0 ? "missing_media" : null,
          !source.brief && !source.detailed ? "missing_description" : null,
        ].filter(Boolean),
        linkedHomework: source.linkedHomework,
        linkedLearningActivities: source.linkedLearningActivities,
        published: source.published,
      });
    }

    if (!matchedSourceIds.has(source.id)) {
      // Orphan relative to canonical Tutorials table (no match).
      // Linked homework/activity presence raises migration care but does not remove orphan status.
      orphans.push({
        classification: "orphan",
        id: source.id,
        title: source.title,
        url: source.url,
        reasons: [
          "no_match_in_canonical_tutorials",
          source.linkedHomework.length ? "has_linked_homework" : null,
          source.linkedLearningActivities.length ? "has_linked_learning_activity" : null,
        ].filter(Boolean),
        linkedHomework: source.linkedHomework,
        linkedLearningActivities: source.linkedLearningActivities,
        published: source.published,
        incomplete: isIncomplete(source),
      });
    }
  }

  // Intra-source duplicates (within orphan table)
  const intra = [];
  for (let i = 0; i < sources.length; i += 1) {
    for (let j = i + 1; j < sources.length; j += 1) {
      const result = classifyPair(sources[i], sources[j]);
      if (!result) continue;
      intra.push({
        classification: result.classification,
        confidence: result.confidence,
        reasons: [...result.reasons, "intra_source"],
        score: result.score,
        sourceId: sources[i].id,
        targetId: sources[j].id,
        sourceTitle: sources[i].title,
        targetTitle: sources[j].title,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      sourceCount: sources.length,
      targetCount: targets.length,
      pairCount: pairs.length,
      orphanCount: orphans.length,
      incompleteCount: incomplete.length,
      intraSourcePairCount: intra.length,
      byClassification: countBy([...pairs, ...orphans, ...incomplete], "classification"),
    },
    pairs,
    orphans,
    incomplete,
    intraSourcePairs: intra,
    policy: {
      neverDeleteByTitleAlone: true,
      automaticDeletionRequires: [
        "exact_duplicate_or_operator_approved_probable",
        "dependency_clear",
        "publish_impact_reviewed",
      ],
    },
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const k = item[key] || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

module.exports = {
  projectRecord,
  classifyPair,
  detectDuplicates,
  isIncomplete,
};

import { describe, expect, it } from "vitest";

import {
  assertStandAloneDoesNotCreateHomeworkCompletion,
  planSubmissionAssetFanout,
  resolveHomeworkCompletionRouting,
  shouldCreateOrUpdateHomeworkCompletion,
} from "@/lib/learning-activities/routing";
import type { LearningActivityDefinition } from "@/types/learning-activities";

function activity(
  overrides: Partial<LearningActivityDefinition> = {},
): LearningActivityDefinition {
  return {
    id: "recLA1",
    name: "Sample activity",
    completionMethod: "quiz",
    homeworkId: null,
    countsAsHomework: false,
    active: true,
    ...overrides,
  };
}

describe("resolveHomeworkCompletionRouting", () => {
  it("creates/updates Homework Completion when linked and configured to count", () => {
    const decision = resolveHomeworkCompletionRouting(
      activity({
        homeworkId: "recHW17",
        countsAsHomework: true,
        completionMethod: "reflection",
      }),
    );

    expect(decision).toEqual({
      action: "create_or_update_homework_completion",
      homeworkId: "recHW17",
      reason: "linked_and_counts_as_homework",
    });
    expect(shouldCreateOrUpdateHomeworkCompletion(activity({
      homeworkId: "recHW17",
      countsAsHomework: true,
    }))).toBe(true);
  });

  it("does not create Homework Completion for stand-alone activities (blank Homework)", () => {
    const decision = resolveHomeworkCompletionRouting(
      activity({
        homeworkId: null,
        countsAsHomework: false,
        completionMethod: "assessment",
      }),
    );

    expect(decision).toEqual({
      action: "no_homework_completion",
      reason: "stand_alone_no_homework_link",
    });
    expect(
      shouldCreateOrUpdateHomeworkCompletion(
        activity({ homeworkId: null, countsAsHomework: false }),
      ),
    ).toBe(false);
  });

  it("treats empty or non-record homework ids as stand-alone", () => {
    expect(
      resolveHomeworkCompletionRouting(
        activity({ homeworkId: "", countsAsHomework: true }),
      ).reason,
    ).toBe("stand_alone_no_homework_link");

    expect(
      resolveHomeworkCompletionRouting(
        activity({ homeworkId: "not-a-record", countsAsHomework: true }),
      ).reason,
    ).toBe("stand_alone_no_homework_link");
  });

  it("does not create Homework Completion when linked but not configured to count", () => {
    const decision = resolveHomeworkCompletionRouting(
      activity({
        homeworkId: "recHW5",
        countsAsHomework: false,
        completionMethod: "file_upload",
      }),
    );

    expect(decision).toEqual({
      action: "no_homework_completion",
      reason: "homework_linked_but_not_configured_to_count",
    });
  });

  it("skips inactive or missing activities", () => {
    expect(resolveHomeworkCompletionRouting(null).reason).toBe("missing_activity");
    expect(
      resolveHomeworkCompletionRouting(activity({ active: false, homeworkId: "recHW1", countsAsHomework: true }))
        .reason,
    ).toBe("activity_inactive");
  });
});

describe("planSubmissionAssetFanout", () => {
  it("fans one response out to multiple Submission Asset intents", () => {
    const plan = planSubmissionAssetFanout({
      id: "recLAR1",
      uploadIntents: [
        {
          filename: "a.pdf",
          contentType: "application/pdf",
          sourceAttachmentId: "att1",
          purpose: "homework_file",
        },
        {
          filename: "b.mp4",
          contentType: "video/mp4",
          sourceAttachmentId: "att2",
          purpose: "video",
        },
      ],
    });

    expect(plan.processingLayer).toBe("Submission Assets");
    expect(plan.responseId).toBe("recLAR1");
    expect(plan.assetIntents).toHaveLength(2);
  });

  it("allows quiz/assessment responses with zero upload intents", () => {
    const plan = planSubmissionAssetFanout({
      id: "recLAR2",
      uploadIntents: [],
    });

    expect(plan.assetIntents).toEqual([]);
    expect(plan.processingLayer).toBe("Submission Assets");
  });

  it("drops intents without filenames", () => {
    const plan = planSubmissionAssetFanout({
      id: "recLAR3",
      uploadIntents: [
        {
          filename: "",
          contentType: null,
          sourceAttachmentId: null,
          purpose: "other",
        },
        {
          filename: "keep.txt",
          contentType: "text/plain",
          sourceAttachmentId: null,
          purpose: "quiz_artifact",
        },
      ],
    });

    expect(plan.assetIntents.map((i) => i.filename)).toEqual(["keep.txt"]);
  });
});

describe("assertStandAloneDoesNotCreateHomeworkCompletion", () => {
  it("rejects countsAsHomework without a Homework link", () => {
    expect(() =>
      assertStandAloneDoesNotCreateHomeworkCompletion(
        activity({ homeworkId: null, countsAsHomework: true }),
      ),
    ).toThrow(/requires a Homework/);
  });

  it("allows stand-alone when countsAsHomework is false", () => {
    expect(() =>
      assertStandAloneDoesNotCreateHomeworkCompletion(
        activity({ homeworkId: null, countsAsHomework: false }),
      ),
    ).not.toThrow();
  });

  it("allows linked homework activities that count", () => {
    expect(() =>
      assertStandAloneDoesNotCreateHomeworkCompletion(
        activity({ homeworkId: "recHW1", countsAsHomework: true }),
      ),
    ).not.toThrow();
  });
});

export type HomeworkAttachment = {
  id: string;
  url: string;
  filename: string;
};

export type HomeworkAssignment = {
  id: string;
  /** Program Homework Assignments row that schedules this library item for the current season. */
  phaId: string;
  title: string;
  displayName: string;
  briefDescription: string;
  /** Coach/parent preview — brief description or a clear fallback when blank. */
  instructionsPreview: string;
  weekId: string;
  weekName: string;
  weekNumber: number;
  weekStartDate: string | null;
  weekEndDate: string | null;
  homeworkNumber: string;
  assignmentNumber: number;
  /** Homework Library `Order` — primary public catalog sort (descending). */
  order: number;
  homeworkSlot: string;
  dueDate: string | null;
  gradeBands: string[];
  submissionRequirement: string | null;
  operatorNotes: string | null;
  book: string;
  bookAbbreviation: string;
  topics: string[];
  coverImage: HomeworkAttachment | null;
  url: string;
  urlAdditional: string;
  /** Legacy library `Grade Band` text when present; PHA grade bands are authoritative for schedule. */
  gradeBandLabel: string;
  fullDescription: string;
  assignmentDescription: string;
  specificSteps: string;
  assignmentRationale: string;
  ageAppropriate: string[];
  docs: HomeworkAttachment[];
};

export type HomeworkWeekGroup = {
  weekId: string;
  weekName: string;
  weekNumber: number;
  weekStartDate: string | null;
  assignments: HomeworkAssignment[];
};

export type HomeworkCatalogData = {
  weekGroups: HomeworkWeekGroup[];
  totalAssignments: number;
  updatedAt: string;
};

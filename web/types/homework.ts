export type HomeworkAttachment = {
  id: string;
  url: string;
  filename: string;
};

export type HomeworkAssignment = {
  id: string;
  title: string;
  displayName: string;
  briefDescription: string;
  weekId: string;
  weekName: string;
  weekNumber: number;
  weekStartDate: string | null;
  homeworkNumber: string;
  assignmentNumber: number;
  order: number;
  book: string;
  bookAbbreviation: string;
  topics: string[];
  coverImage: HomeworkAttachment | null;
  url: string;
  urlAdditional: string;
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

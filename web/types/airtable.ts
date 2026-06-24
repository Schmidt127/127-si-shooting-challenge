/** Generic Airtable REST API shapes used by the web app. */

export type AirtableRecord<TFields> = {
  id: string;
  createdTime?: string;
  fields: TFields;
};

export type AirtableListResponse<TFields> = {
  records: AirtableRecord<TFields>[];
  offset?: string;
};

export type AirtableAttachment = {
  id: string;
  url: string;
  filename?: string;
  size?: number;
  type?: string;
};

export type AirtableLinkedRecord = string;

export type AirtableSingleSelect = {
  id?: string;
  name: string;
  color?: string;
};

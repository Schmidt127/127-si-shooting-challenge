/**
 * Minimal Airtable automation-script environment mock.
 *
 * Runs REAL production automation scripts (e.g. 115) offline by providing
 * `base`, `input`, `output`, and a capturing `console`. Field types matter:
 * scripts use field.type / field.options.choices / field.isComputed for
 * writability and single-select validation, so mocks must declare them.
 */

export class MockRecord {
  constructor(id, cells) {
    this.id = id;
    this.cells = { ...cells };
  }

  getCellValue(fieldName) {
    const v = this.cells[fieldName];
    return v === undefined ? null : v;
  }

  getCellValueAsString(fieldName) {
    const v = this.cells[fieldName];
    if (v === null || v === undefined) return "";
    if (Array.isArray(v)) {
      return v
        .map((item) => (item && typeof item === "object" ? item.name || item.id || "" : String(item)))
        .join(", ");
    }
    if (typeof v === "object") return v.name || String(v);
    return String(v);
  }
}

export class MockTable {
  constructor(name, fields, records = []) {
    this.name = name;
    this.fields = fields.map((f) => ({
      isComputed: false,
      options: undefined,
      ...f,
    }));
    this.records = new Map(records.map((r) => [r.id, r]));
    this.createdPayloads = [];
    this.updates = [];
    this._nextId = 1;
  }

  getField(fieldName) {
    const field = this.fields.find((f) => f.name === fieldName);
    if (!field) throw new Error(`Field not found on ${this.name}: ${fieldName}`);
    return field;
  }

  async selectRecordAsync(recordId, _opts) {
    return this.records.get(recordId) || null;
  }

  async createRecordAsync(payload) {
    const id = `rec${this.name.replace(/\W/g, "").slice(0, 6)}NEW${this._nextId++}`;
    this.createdPayloads.push({ id, payload });
    this.records.set(id, new MockRecord(id, payloadToCells(payload)));
    return id;
  }

  async updateRecordAsync(recordId, fields) {
    this.updates.push({ recordId, fields });
    const rec = this.records.get(recordId);
    if (rec) Object.assign(rec.cells, payloadToCells(fields));
  }

  async selectRecordsAsync(_opts) {
    return {
      records: Array.from(this.records.values()),
      unloadData: () => {},
    };
  }
}

function payloadToCells(payload) {
  const cells = {};
  for (const [k, v] of Object.entries(payload)) {
    cells[k] = v && typeof v === "object" && v.name !== undefined && !Array.isArray(v) ? v.name : v;
  }
  return cells;
}

export class MockBase {
  constructor(tables) {
    this.tables = new Map(tables.map((t) => [t.name, t]));
    this.getTableCalls = [];
  }

  getTable(name) {
    this.getTableCalls.push(name);
    const t = this.tables.get(name);
    if (!t) throw new Error(`Table not found in mock base: ${name}`);
    return t;
  }
}

export class MockOutput {
  constructor() {
    this.values = {};
  }

  set(key, value) {
    this.values[key] = value;
  }
}

export function makeInput(config) {
  return { config: () => ({ ...config }) };
}

export function makeConsole() {
  const lines = [];
  return {
    lines,
    log: (...args) => lines.push(args.map(String).join(" ")),
    error: (...args) => lines.push("ERR " + args.map(String).join(" ")),
    warn: (...args) => lines.push("WARN " + args.map(String).join(" ")),
  };
}

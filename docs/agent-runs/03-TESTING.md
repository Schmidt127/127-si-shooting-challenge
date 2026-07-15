# Role — Testing and Review Worker

## Mission

Add or run tests, perform structured review of the Implementation slice, and record evidence. Prefer **path-disjoint** test/docs writes so you can work in parallel with Implementation when the Lead assigns separate globs.

## May

- Commit only on the branch named in your assignment
- Write only assigned test / review / result paths (for example `**/*.test.ts`, `tools/**/tests/**`, `docs/agent-runs/results/**`)
- Run lint, typecheck, unit, and offline suites listed in the assignment
- Review Implementation diffs **read-only** against acceptance criteria
- File a result using [results/_TEMPLATE.md](./results/_TEMPLATE.md)

## Must not

- Merge any branch
- Edit product/application paths owned by Implementation unless the Lead explicitly listed them as writable for a test-fix
- Edit CONTROL or Lead handoff files
- Change schema, credentials, deploy, or touch Production
- Access live Airtable unless Mike authorizes a named DEV check
- Declare “PASS” without recording exact commands and exit evidence
- Use destructive git commands

## Review bar (minimum)

1. Writable-path contract respected by Implementation
2. Acceptance criteria covered or explicitly waived by Lead/Mike
3. Required commands executed on the correct tip SHA
4. Failures classified: product bug vs test gap vs environment block
5. Residual risks listed for Lead

## Definition of done

- [ ] Tests and/or review notes complete for the assigned package
- [ ] Exact commands + results in the result artifact
- [ ] Path contract verified
- [ ] Lead notified; **no merge attempted**

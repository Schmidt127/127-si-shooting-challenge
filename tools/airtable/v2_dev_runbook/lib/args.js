"use strict";

/**
 * Minimal argv parser for the DEV runbook CLI.
 * Never logs secret values.
 */

function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set();
  const options = {};
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      if (eq > 2) {
        const key = token.slice(2, eq);
        options[key] = token.slice(eq + 1);
        flags.add(key);
      } else {
        const key = token.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith("-")) {
          // boolean flags that take no value
          const booleanFlags = new Set([
            "dev-confirm",
            "execute",
            "rollback-only",
            "smoke-only",
            "json",
            "help",
          ]);
          if (booleanFlags.has(key)) {
            flags.add(key);
            options[key] = true;
          } else {
            options[key] = next;
            flags.add(key);
            i += 1;
          }
        } else {
          flags.add(key);
          options[key] = true;
        }
      }
    } else if (token.startsWith("-") && token.length === 2) {
      flags.add(token.slice(1));
      options[token.slice(1)] = true;
    } else {
      positionals.push(token);
    }
  }

  return {
    command: positionals[0] || "",
    positionals: positionals.slice(1),
    flags,
    options,
    has(flag) {
      return flags.has(flag);
    },
    get(name, fallback = "") {
      return options[name] != null ? options[name] : fallback;
    },
  };
}

function printHelp() {
  return `
V2 DEV Runbook Operator CLI (safe)

Usage:
  node tools/airtable/v2_dev_runbook/cli.js <command> [args] [flags]

Commands:
  list                         List matrix tests (mark live-supported)
  plan [--smoke-only]          Print execution plan
  verify-env                   Check token presence + DEV base + schema probes
  run-offline                  Run offline fixture suite
  run-test <test-id>           Plan/execute one supported live test (dry-run default)
  collect-evidence <test-id>   Write/update evidence markdown for a run
  cleanup <test-id>            Cleanup records owned by a local run-state
  status                       Show local run-state + evidence summary
  help                         Show this help

Safety flags (live actions):
  --dev-confirm                Required for any live/env action beyond list/plan/offline
  --execute                    Required for Airtable writes (default is dry-run)
  --rollback-only              Cleanup: revert owned records only (no broad delete)
  --enrollment <rec...>        Override test enrollment id
  --assignment <rec...>        Homework assignment id (C4)
  --meeting <rec...>           Zoom Meeting id (J1/J4/J5)
  --week <rec...>              Week id (G3)
  --operator <name>            Operator label for evidence
  --notes <text>               Operator notes for evidence

Hard stops:
  BASE_ID must equal appTetnuCZlCZdTCT
  PROD base appn84sqPw03zEbTT is always refused
  Tokens are never printed
  Make/email/M1/M2 tests are not implemented in this CLI yet
`.trim();
}

module.exports = {
  parseArgs,
  printHelp,
};

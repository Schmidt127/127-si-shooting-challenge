#!/usr/bin/env node
"use strict";

require("./was-uniqueness.test.js");
require("./empty-week-policy.test.js");
require("./handoff-ownership.test.js");
require("./sendmode-prod-contract.test.js");
require("./send-mode-helper.test.js");
require("./send-mode-live-test-regression.test.js");
require("./schedule-on-contract.test.js");
require("./weekly-summary-email-content.test.js");
require("./perfect-week-criteria.test.js");
console.log("all was-email-contracts tests passed");
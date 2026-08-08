#!/usr/bin/env node
/** Automation 071 v3.6 — parent-facing URL and writeback contract. */
"use strict";
const assert=require("assert");const fs=require("fs");const path=require("path");const {spawnSync}=require("child_process");
const SCRIPT_PATH=path.join(__dirname,"../../airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js");const source=fs.readFileSync(SCRIPT_PATH,"utf8");let passed=0;
function test(n,f){f();passed++;console.log(`ok - ${n}`)}
function resolve(fields={}){return String(fields.reviewer||"").trim()||String(fields.driveView||"").trim()||String(fields.driveFile||"").trim()||""}
test("syntax",()=>{const r=spawnSync(process.execPath,["--check",SCRIPT_PATH],{encoding:"utf8"});assert.strictEqual(r.status,0,r.stderr)});
test("version is v3.6",()=>assert.match(source,/Version: v3\.6/));
test("Reviewer File URL is primary",()=>{assert.match(source,/reviewer:\"Reviewer File URL\"/);assert.match(source,/function assetUrl/);assert.strictEqual(resolve({reviewer:"reviewer",driveView:"view",driveFile:"file"}),"reviewer")});
test("Drive URL fallback remains",()=>{assert.strictEqual(resolve({driveView:"view",driveFile:"file"}),"view");assert.strictEqual(resolve({driveFile:"file"}),"file")});
test("private canonical S3 fields are not selected",()=>{assert.doesNotMatch(source,/Canonical File URL/);assert.doesNotMatch(source,/Storage Key/)});
test("Make owns final sent writeback",()=>{assert.doesNotMatch(source,/Parent Feedback Sent On/);assert.doesNotMatch(source,/updateRecordAsync\([^\n]+Parent Feedback Sent\?/);assert.match(source,/Parent Feedback Subject/);assert.match(source,/Parent Feedback Send Error/)});
test("semantic Make failure is rejected",()=>{assert.match(source,/semanticFailure/);assert.match(source,/Webhook semantic failure/)});
console.log(`PASS ${passed} Automation 071 reviewer URL contracts`);

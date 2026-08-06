import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
function loadEnv(){for(const p of [resolve(ROOT,"web/.env.local"),resolve(ROOT,".env.local"),resolve(ROOT,".env")]){if(!existsSync(p))continue;for(const line of readFileSync(p,"utf8").split(/\r?\n/)){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(!m)continue;let v=m[2];if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);if(!process.env[m[1]])process.env[m[1]]=v;}}}
loadEnv();
const TOKEN=process.env.AIRTABLE_API_TOKEN; const BASE="appn84sqPw03zEbTT";
const headers={Authorization:`Bearer ${TOKEN}`,"Content-Type":"application/json"};
const ids=["recqXxlOpATQI3sD4","rechzFmWrUp1tonto"];
for (const id of ids){
  const res=await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent("Homework Completions")}/${id}`,{method:"PATCH",headers,body:JSON.stringify({fields:{"Satisfactory?":true,"Completion Status":"Satisfactory","Review Complete":true}})});
  const t=await res.text();
  console.log(id, res.status, t.includes("Satisfactory"));
}
await new Promise(r=>setTimeout(r,2000));
const was=await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent("Weekly Athlete Summary")}/recKebuZ79QFTwivA`,{headers:{Authorization:`Bearer ${TOKEN}`}});
const j=await was.json();
console.log({assigned:j.fields["Homework Assigned Count"], sat:j.fields["Homework Satisfactory Count"], hw:j.fields.Homework});

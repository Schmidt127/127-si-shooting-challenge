/* One-time PKG-007 baseline. Explicit reviewed allowlist; dry-run by default. */
// @ts-nocheck
const CONFIRM_WRITE = false;
const REVIEWED_HC_RECORD_IDS = [];
const MAX_RECORDS = 25;
const N = { hc:"Homework Completions",xp:"XP Events",enr:"Enrollments",pha:"Program Homework Assignments",was:"Weekly Athlete Summary",current:"Homework XP Current Signature",last:"Last Homework XP Reconciled Signature" };
function ids(r,n){const v=r.getCellValue(n);return Array.isArray(v)?v.map(x=>x?.id).filter(Boolean):[];}
function text(r,n){return String(r.getCellValueAsString(n)||"").trim();}
function yes(r,n){const v=r.getCellValue(n);return v===true||v===1||String(v??"").toLowerCase()==="true";}
function same(a,b){return a.length===b.length&&[...a].sort().every((x,i)=>x===[...b].sort()[i]);}
const allow=[...new Set(REVIEWED_HC_RECORD_IDS.map(String))].sort();
if(allow.length>MAX_RECORDS)throw new Error(`Allowlist exceeds MAX_RECORDS=${MAX_RECORDS}.`);
if(CONFIRM_WRITE&&!allow.length)throw new Error("CONFIRM_WRITE requires a non-empty explicit reviewed HC allowlist.");
if(allow.some(id=>!/^rec[a-zA-Z0-9]{14}$/.test(id)))throw new Error("Allowlist contains an invalid Airtable record ID.");
const hcT=base.getTable(N.hc),xpT=base.getTable(N.xp),enrT=base.getTable(N.enr),phaT=base.getTable(N.pha),wasT=base.getTable(N.was);
const [hq,xq,eq,pq,wq]=await Promise.all([
  hcT.selectRecordsAsync({fields:[N.current,N.last,"Enrollment","Week","Homework","Program Homework Assignment","Item Slot","Submissions - Linked","Satisfactory?","Review Complete","Coach Feedback","Total Homework XP Awarded"]}),
  xpT.selectRecordsAsync({fields:["Source Key","Homework Completion","Enrollment","Week","Submission","Weekly Athlete Summary","XP Points","Active?","XP Source","XP Bucket"]}),
  enrT.selectRecordsAsync({fields:["Active?","Program Instance"]}),
  phaT.selectRecordsAsync({fields:["Active?","Homework Assignment","Week","Program Instance","Homework Slot"]}),
  wasT.selectRecordsAsync({fields:["Enrollment","Week"]}),
]);
const clean=[],rejected=[];
for(const id of allow){
  const h=hq.getRecord(id),problems=[];
  if(!h){rejected.push({id,problems:["missing Homework Completion"]});continue;}
  const enr=ids(h,"Enrollment"),week=ids(h,"Week"),hw=ids(h,"Homework"),phaIds=ids(h,"Program Homework Assignment"),subs=ids(h,"Submissions - Linked");
  if(enr.length!==1)problems.push("Enrollment cardinality");if(week.length!==1)problems.push("Week cardinality");if(hw.length!==1)problems.push("Homework cardinality");if(phaIds.length!==1)problems.push("PHA cardinality");if(!subs.length)problems.push("missing Submission");
  const e=enr.length===1?eq.getRecord(enr[0]):null,p=phaIds.length===1?pq.getRecord(phaIds[0]):null;
  if(!e||!yes(e,"Active?"))problems.push("inactive/missing Enrollment");if(!p||!yes(p,"Active?"))problems.push("inactive/missing PHA");
  if(p&&(!same(ids(p,"Homework Assignment"),hw)||!same(ids(p,"Week"),week)||!same(ids(p,"Program Instance"),e?ids(e,"Program Instance"):[])||text(p,"Homework Slot")!==text(h,"Item Slot")))problems.push("PHA ownership");
  const key=`HOMEWORK_XP|${id}`,exact=xq.records.filter(x=>text(x,"Source Key")===key||ids(x,"Homework Completion").includes(id));
  const canonicalWas=wq.records.filter(w=>same(ids(w,"Enrollment"),enr)&&same(ids(w,"Week"),week));
  if(canonicalWas.length!==1)problems.push("canonical WAS cardinality");
  const eligible=yes(h,"Satisfactory?")&&yes(h,"Review Complete")&&Boolean(text(h,"Coach Feedback"))&&Number(h.getCellValue("Total Homework XP Awarded"))>0;
  if(exact.length>1)problems.push("duplicate exact XP Events");if(eligible&&exact.length!==1)problems.push("eligible row missing exact XP Event");
  if(exact[0]){const x=exact[0],xs=ids(x,"Submission"),xwas=ids(x,"Weekly Athlete Summary");if(text(x,"Source Key")!==key||!same(ids(x,"Homework Completion"),[id])||!same(ids(x,"Enrollment"),enr)||!same(ids(x,"Week"),week)||xs.length!==1||!subs.includes(xs[0])||canonicalWas.length!==1||!same(xwas,[canonicalWas[0]?.id].filter(Boolean))||Number(x.getCellValue("XP Points"))!==Number(h.getCellValue("Total Homework XP Awarded"))||text(x,"XP Source")!=="Homework Completion"||text(x,"XP Bucket")!=="Homework Completion")problems.push("XP ownership/points/canonical WAS");if(yes(x,"Active?")!==eligible)problems.push("XP active-state mismatch");}
  const current=text(h,N.current);if(!current)problems.push("blank current signature");
  if(problems.length)rejected.push({id,problems});else clean.push({id,current,last:text(h,N.last)});
}
console.log(JSON.stringify({script:"initialize-homework-xp-reconciliation-signatures",dryRun:!CONFIRM_WRITE,reviewedAllowlist:allow,cleanIds:clean.map(x=>x.id),rejected},null,2));
if(rejected.length)throw new Error("Allowlist contains rows that are not audit-clean; no writes performed.");
if(CONFIRM_WRITE){const changes=clean.filter(x=>x.current!==x.last);if(changes.length)await hcT.updateRecordsAsync(changes.map(x=>({id:x.id,fields:{[N.last]:x.current}})));console.log(`Initialized ${changes.length} explicitly reviewed reconciliation signatures.`);}

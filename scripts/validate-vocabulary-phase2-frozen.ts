import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Item = { id: string | null; chapter_number: number; sort_order: number; prompt: string; reading: string; [key: string]: unknown };
type Manifest = { status: string; content_status?: string; uuid_status?: string; database_modified: boolean; sql_executed: boolean; migration_created: boolean; runtime_vocabulary_code_changed: boolean; review_progress_modified?: boolean; chapter_counts: Record<string,number>; items: Item[]; [key:string]:unknown };

const root = resolve(import.meta.dirname, '..');
const content = resolve(root, 'content/vocabulary');
const prePath = resolve(content, 'vocabulary_phase2_gate2d_verified_preuuid_manifest.json');
const frozenPath = resolve(content, 'vocabulary_phase2_final_frozen_manifest.json');
const verificationPath = resolve(content, 'vocabulary_phase2_gate2d_verification_audit.json');
const auditPath = resolve(content, 'vocabulary_phase2_gate2d_frozen_validation.json');
const hashPath = resolve(content, 'vocabulary_phase2_final_frozen_manifest.sha256');

const pre = JSON.parse(readFileSync(prePath,'utf8')) as Manifest;
const frozenRaw = readFileSync(frozenPath,'utf8');
const frozen = JSON.parse(frozenRaw) as Manifest;
const verification = JSON.parse(readFileSync(verificationPath,'utf8')) as any;
const errors: Array<Record<string,unknown>> = [];

if (verification.status !== 'PASS' || verification.verification_passed !== true || (verification.errors ?? []).length !== 0) errors.push({code:'PRE_UUID_VERIFICATION_NOT_PASS'});
if (pre.items.length !== 2020 || frozen.items.length !== 2020) errors.push({code:'FINAL_COUNT_MISMATCH',pre:pre.items.length,frozen:frozen.items.length});
if (frozen.status !== 'CONTENT_FROZEN_UUID_FROZEN' || frozen.content_status !== 'CONTENT_FROZEN' || frozen.uuid_status !== 'UUID_FROZEN') errors.push({code:'FREEZE_STATUS_INVALID'});
if (frozen.database_modified !== false || frozen.sql_executed !== false || frozen.migration_created !== false || frozen.runtime_vocabulary_code_changed !== false || frozen.review_progress_modified !== false) errors.push({code:'FORBIDDEN_DATABASE_OR_RUNTIME_CHANGE'});

const uuidRegex=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ids=new Set<string>();
for (let i=0;i<frozen.items.length;i++) {
  const before=pre.items[i]; const after=frozen.items[i];
  const id=after.id;
  if (!id) errors.push({code:'MISSING_UUID',index:i,prompt:after.prompt});
  else {
    if (!uuidRegex.test(id)) errors.push({code:'INVALID_UUID_FORMAT',index:i,prompt:after.prompt,id});
    if (ids.has(id)) errors.push({code:'DUPLICATE_UUID',index:i,prompt:after.prompt,id});
    ids.add(id);
  }
  const beforeWithoutId={...before,id:null};
  const afterWithoutId={...after,id:null};
  if (JSON.stringify(beforeWithoutId)!==JSON.stringify(afterWithoutId)) errors.push({code:'CONTENT_CHANGED_DURING_UUID_FREEZE',index:i,prompt:after.prompt});
}

for (let ch=2;ch<=35;ch++) {
  const rows=frozen.items.filter(x=>x.chapter_number===ch);
  if (frozen.chapter_counts[String(ch)]!==rows.length) errors.push({code:'CHAPTER_COUNT_METADATA_MISMATCH',chapter:ch});
  const orders=rows.map(x=>x.sort_order);
  const expected=Array.from({length:rows.length},(_,i)=>i+1);
  if (orders.join(',')!==expected.join(',')) errors.push({code:'SORT_ORDER_CHANGED',chapter:ch});
}

const manifestSha256=createHash('sha256').update(frozenRaw,'utf8').digest('hex');
const uuidSequenceSha256=createHash('sha256').update(frozen.items.map(x=>x.id).join('\n'),'utf8').digest('hex');
const passed=errors.length===0;
const audit={
  phase:'VOCABULARY PHASE 2 — GATE 2D',
  stage:'FROZEN_UUID_VALIDATION',
  status:passed?'PASS':'FAIL',
  final_bab2_35:frozen.items.length,
  projected_including_bab1:frozen.items.length+80,
  uuid:{assigned:ids.size,missing:frozen.items.filter(x=>!x.id).length,duplicate:frozen.items.length-ids.size,invalid_format:errors.filter(x=>x.code==='INVALID_UUID_FORMAT').length,sequence_sha256:uuidSequenceSha256},
  content_changed_during_uuid_freeze:errors.filter(x=>x.code==='CONTENT_CHANGED_DURING_UUID_FREEZE').length,
  manifest_sha256:manifestSha256,
  database:{modified:false,sql_executed:false,migration:false,review_progress_modified:false},
  runtime:{changed:false},
  errors,
};
writeFileSync(hashPath,`${manifestSha256}  vocabulary_phase2_final_frozen_manifest.json\n`,'utf8');
writeFileSync(auditPath,JSON.stringify(audit,null,2)+'\n','utf8');
console.log(JSON.stringify({status:audit.status,assigned:audit.uuid.assigned,missing:audit.uuid.missing,duplicate:audit.uuid.duplicate,contentChanged:audit.content_changed_during_uuid_freeze,manifestSha256,uuidSequenceSha256},null,2));
if(!passed) process.exitCode=1;

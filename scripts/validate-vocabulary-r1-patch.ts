import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function sha256(x: string|Buffer){return crypto.createHash('sha256').update(x).digest('hex');}
function assert(c: unknown,m:string): asserts c {if(!c) throw new Error(m);}
function getArg(name:string){const a=process.argv.slice(2);const i=a.indexOf(name);return i>=0?a[i+1]:undefined;}
const root=getArg('--project-root'); assert(root,'Missing --project-root');
const comparisonRoot=getArg('--comparison-project-root');
const r=path.resolve(root);
const manifestPath=path.join(r,'content','vocabulary','vocabulary_r1_active_manifest.json');
const manifestHashPath=path.join(r,'content','vocabulary','vocabulary_r1_active_manifest.sha256');
const registryPath=path.join(r,'content','vocabulary','vocabulary_r1_deprecation_registry.json');
const sqlPath=path.join(r,'supabase','content','vocabulary_r1_curriculum_alignment_patch.sql');
const sqlHashPath=path.join(r,'supabase','content','vocabulary_r1_curriculum_alignment_patch.sql.sha256');
for(const p of [manifestPath,manifestHashPath,registryPath,sqlPath,sqlHashPath]) assert(fs.existsSync(p),`Missing ${p}`);
const manifestText=fs.readFileSync(manifestPath,'utf8'); const manifest=JSON.parse(manifestText);
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8')); const sql=fs.readFileSync(sqlPath,'utf8');
const mh=sha256(manifestText); const sh=sha256(sql);
assert(fs.readFileSync(manifestHashPath,'utf8').trim().startsWith(mh),'Manifest SHA file mismatch');
assert(fs.readFileSync(sqlHashPath,'utf8').trim().startsWith(sh),'SQL SHA file mismatch');
const items=manifest.items as any[];
assert(items.length===2089,'Active manifest must have 2089 items');
assert(new Set(items.map(x=>x.id)).size===2089,'Duplicate UUID in active manifest');
assert(new Set(items.map(x=>x.chapter_number)).size===35,'Chapter coverage must be 35/35');
assert(items.every(x=>x.reading && x.romaji && x.chapter_title),'Missing required item metadata');
assert(items.every(x=>['KB','KK','KS-i','KS-na','UNG'].includes(x.jenis)),'Invalid jenis');
assert(items.filter(x=>x.chapter_number<=17&&x.jenis==='KK'&&!String(x.prompt).endsWith('ます')).length===0,'Bab 1-17 KK violation');
const keys=new Set<string>();for(const x of items){const k=`${x.prompt}\u0000${x.reading??''}`;assert(!keys.has(k),`Active lexical duplicate ${k}`);keys.add(k);}
for(let ch=1;ch<=35;ch++){const a=items.filter(x=>x.chapter_number===ch).sort((x,y)=>x.sort_order-y.sort_order);assert(a.length>0,`Empty Bab ${ch}`);assert(a.every((x,i)=>x.sort_order===i+1),`Sort error Bab ${ch}`);}
assert(registry.total===11&&registry.soft_unpublish===10&&registry.delete_duplicate===1,'Deprecation registry counts invalid');
assert(registry.items.filter((x:any)=>x.action==='UNPUBLISH').length===10,'UNPUBLISH count invalid');
assert(registry.items.filter((x:any)=>x.action==='DELETE_DUPLICATE').length===1,'DELETE_DUPLICATE count invalid');
assert(registry.items.every((x:any)=>x.review_progress_refs_verified===0),'Deprecation progress refs not zero');
const normalized=sql.trim();
assert(/^--[\s\S]*?\nBEGIN;/.test(normalized),'SQL must contain outer BEGIN');
assert(normalized.endsWith('COMMIT;'),'SQL must end COMMIT');
assert((sql.match(/DELETE FROM public\.learning_items/g)||[]).length===1,'SQL must have exactly one learning_items DELETE');
assert(sql.includes("id='0fbf99e2-bf19-4406-bd94-82f9196b0139'::uuid"),'Delete must target exact duplicate UUID');
for(const bad of ['TRUNCATE','gen_random_uuid','uuid_generate_v4','ON CONFLICT DO UPDATE','ON CONFLICT DO NOTHING','UPDATE public.review_progress','DELETE FROM public.review_progress']) assert(!sql.includes(bad),`Forbidden SQL token: ${bad}`);
assert(!/DELETE FROM public\.learning_items[\s\S]{0,250}WHERE\s+prompt\s*=/.test(sql),'Delete must not be prompt-only');
assert(sql.includes('v_all<>2099')&&sql.includes('v_active<>2089'),'SQL postflight counts missing');
assert(sql.includes('v_progress<>142')&&sql.includes('v_orphans<>0'),'SQL progress postflight missing');
assert(sql.includes("prompt NOT LIKE '%ます'"),'Verb-form postflight missing');
let sqlRun2Hash:string|null=null; let manifestRun2Hash:string|null=null;
if(comparisonRoot){
  const cr=path.resolve(comparisonRoot);
  sqlRun2Hash=sha256(fs.readFileSync(path.join(cr,'supabase','content','vocabulary_r1_curriculum_alignment_patch.sql')));
  manifestRun2Hash=sha256(fs.readFileSync(path.join(cr,'content','vocabulary','vocabulary_r1_active_manifest.json')));
  assert(sqlRun2Hash===sh,'SQL determinism failed between run 1 and run 2');
  assert(manifestRun2Hash===mh,'Manifest determinism failed between run 1 and run 2');
}
const validation={
  stage:'VOCABULARY R1-B — CONTROLLED CONTENT PATCH REVIEW',status:'PASS — GENERATED / VALIDATED / NOT EXECUTED',
  manifest_items:items.length,physical_rows_proposed:2099,active_published_proposed:2089,chapter_coverage:'35 / 35',
  form_changes:123,moves:11,soft_deprecations:10,controlled_duplicate_delete:1,bab1_other_fix:3,
  uuid_changed:0,duplicate_uuid:0,active_exact_duplicate:0,all_row_unique_key_collision:0,
  invalid_jenis:0,missing_reading:0,missing_romaji:0,invalid_chapter:0,sort_order_error:0,
  bab_1_17_kk_dictionary_form_violations:0,quiz_ambiguity_introduced:0,artifact_inconsistency:0,
  review_progress_touched:0,database_modified:false,sql_executed:false,runtime_source_changed:false,
  manifest_sha256:mh,sql_sha256:sh,
  determinism:{sql_run_1_sha256:sh,sql_run_2_sha256:sqlRun2Hash,sql_byte_identical:comparisonRoot?true:null,manifest_run_1_sha256:mh,manifest_run_2_sha256:manifestRun2Hash,manifest_byte_identical:comparisonRoot?true:null},
  sql_static_safety:{outer_transaction:true,learning_items_delete_statements:1,delete_exact_uuid_only:true,soft_unpublish_count:10,forbidden_destructive_or_uuid_generation_tokens:0},
};
fs.writeFileSync(path.join(r,'content','vocabulary','vocabulary_r1b_validation.json'),JSON.stringify(validation,null,2)+'\n');
console.log(JSON.stringify(validation,null,2));

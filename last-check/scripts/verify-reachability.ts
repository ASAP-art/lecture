import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { GAME_CONTENT, GAME_INDEX } from '../src/content/game-content';
import { evaluateCondition, type Condition } from '../src/content/conditions';
import type { RuntimeGameState } from '../src/engine/state';
import { DEDUCTION_RULES, EXPECTED_CHOICES, EXPECTED_ENDINGS, SOURCE_BASIS, expectedAllowed, expectedEnding, meetsDeduction } from '../tests/fixtures/decision-oracle';
import { assertDeniedUnchanged, beginAt, finishEnding, play, select, toBoundary } from '../tests/helpers/engine-walk';

const scenes=[...GAME_INDEX.scenes.values()];
assert.equal(scenes.length,82);
assert.equal(GAME_CONTENT.unimplementedSceneIds.length,0);
const outgoing=new Map(scenes.map(scene=>[scene.id,[
  ...scene.choices.map(choice=>choice.resultSceneId),
  ...(scene.nextSceneId?[scene.nextSceneId]:[]),
  ...(scene.nextVariants??[]).map(route=>route.sceneId),
]]));
const ownEffects=new Map(scenes.map(scene=>[scene.id,new Set([
  ...scene.entryEffectIds,...scene.choices.flatMap(c=>c.effectIds),...scene.blocks.flatMap(b=>b.completionEffectIds),
])]));
const activeGraph=new Set<string>();
const futureEffects=new Map<string,Set<string>>();
function effectClosure(sceneId:string):Set<string>{
  const previous=futureEffects.get(sceneId);if(previous)return previous;
  assert(!activeGraph.has(sceneId),`static scene loop: ${sceneId}`);
  activeGraph.add(sceneId);
  const result=new Set(ownEffects.get(sceneId));
  for(const target of outgoing.get(sceneId)??[]){
    assert(GAME_INDEX.scenes.has(target),`undefined scene: ${target}`);
    for(const effectId of effectClosure(target))result.add(effectId);
  }
  activeGraph.delete(sceneId);futureEffects.set(sceneId,result);return result;
}
for(const scene of scenes)effectClosure(scene.id);

const referencedTrust=new Set<string>();
function inspect(condition:Condition):void{
  switch(condition.op){
    case 'all':case 'any':condition.conditions.forEach(inspect);break;
    case 'not':inspect(condition.condition);break;
    case 'trustAtLeast':referencedTrust.add(condition.characterId);break;
    case 'hasEvidence':case 'hasDeduction':case 'flag':break;
    default:{const impossible:never=condition;throw new Error(`unclassified predicate: ${JSON.stringify(impossible)}`);}
  }
}
for(const scene of scenes){
  if(scene.entryCondition)inspect(scene.entryCondition);
  for(const route of scene.nextVariants??[])inspect(route.when);
  for(const choice of scene.choices)if(choice.condition)inspect(choice.condition);
  for(const block of scene.blocks){
    if(block.condition)inspect(block.condition);
    if(block.confirmationCondition)inspect(block.confirmationCondition);
    if(block.content.type==='conditional')block.content.variants.forEach(v=>inspect(v.when));
  }
}
for(const effect of GAME_CONTENT.effects)if(effect.condition)inspect(effect.condition);
const trustIds=[...referencedTrust].sort();
const supplementEvidence:Readonly<Record<string,string>>={C15_A:'E07',C15_B:'E04',C15_C:'E11'};
const sorted=(values:ReadonlySet<string>)=>[...values].sort();
function key(state:RuntimeGameState):string{
  const current=GAME_INDEX.scenes.get(state.sceneId)!;
  const live=futureEffects.get(state.sceneId)!;
  return JSON.stringify([
    state.sceneId,state.displayStage,state.blockId,state.blockCursor,state.blockDisplay,
    sorted(state.evidence),sorted(state.deductions),Object.entries(state.flags).sort(([a],[b])=>a.localeCompare(b)),
    trustIds.map(id=>[id,state.relations[id]!.trust]),
    [...state.appliedEffects].filter(id=>live.has(id)).sort(),
    current.blocks.flatMap(b=>state.resolvedVariants[b.id]?[[b.id,state.resolvedVariants[b.id]]]:[]),
    state.choiceHistory.some(entry=>entry.sceneId===state.sceneId),
  ]);
}
interface Suffix{choices:string[];ending:string}
interface Witness{route:string[];ending:string}
const memo=new Map<string,Suffix>();
const active=new Set<string>();
const choiceWitnesses=new Map<string,Witness>();
const endingWitnesses=new Map<string,Witness>();
const visitedScenes=new Set<string>();
const terminalByEnding=new Map<string,number>();
let decisionClasses=0,terminalClasses=0,allowedEdges=0,rejectedEdges=0;
let checkedCommonE06=0,checkedCommonE09=0;
function boundary(state:RuntimeGameState):RuntimeGameState{
  return toBoundary(state,sceneId=>{visitedScenes.add(sceneId);});
}
function solve(state:RuntimeGameState,prefix:string[]):Suffix{
  const stateKey=key(state);
  const cached=memo.get(stateKey);if(cached)return cached;
  assert(!active.has(stateKey),`reachable state loop: ${state.sceneId}`);
  active.add(stateKey);
  if(state.sceneId.startsWith('END_')){
    finishEnding(state);
    terminalClasses+=1;
    terminalByEnding.set(state.sceneId,(terminalByEnding.get(state.sceneId)??0)+1);
    const suffix={choices:[],ending:state.sceneId};memo.set(stateKey,suffix);active.delete(stateKey);
    if(!endingWitnesses.has(state.sceneId))endingWitnesses.set(state.sceneId,{route:prefix,ending:state.sceneId});
    return suffix;
  }
  assert.equal(state.displayStage,'choice',`unintended dead end: ${state.sceneId}/${state.displayStage}`);
  decisionClasses+=1;
  if(state.sceneId==='CH07_S03'){assert(state.evidence.has('E06'));checkedCommonE06+=1;}
  if(state.sceneId==='CH08_S01'){assert(state.evidence.has('E09'));checkedCommonE09+=1;}
  const scene=GAME_INDEX.scenes.get(state.sceneId)!;
  let firstSuffix:Suffix|undefined;
  let legal=0;
  for(const choice of scene.choices){
    const expected=expectedAllowed(choice.id,state);
    const declared=!choice.condition||evaluateCondition(choice.condition,state);
    assert.equal(declared,expected,`source/declared permission mismatch: ${choice.id}`);
    if(!expected){assertDeniedUnchanged(state,choice.id);rejectedEdges+=1;continue;}
    legal+=1;allowedEdges+=1;
    const selected=select(state,choice.id);
    assert.equal(key(state),stateKey,`choice mutates its decision input: ${choice.id}`);
    const rule=DEDUCTION_RULES.find(candidate=>candidate.choice===choice.id);
    const expectedGain=rule&&meetsDeduction(state,rule)?[rule.id]:[];
    assert.deepEqual([...selected.deductions].filter(id=>!state.deductions.has(id)).sort(),expectedGain,`deduction mismatch: ${choice.id}`);
    if(choice.id.startsWith('C15_')){
      const award=supplementEvidence[choice.id];
      assert(award);
      assert.deepEqual(sorted(selected.evidence),sorted(new Set([...state.evidence,award])),'C15 repairs more than one evidence');
      const character=choice.id==='C15_C'?'CHAR_SUHYEON':'CHAR_JUNSEOK';
      assert.equal(selected.relations[character]!.trust,Math.min(2,state.relations[character]!.trust+1));
    }
    const child=boundary(selected);
    if(choice.id.startsWith('C24_'))assert.equal(child.sceneId,expectedEnding(choice.id,state));
    const childSuffix=solve(child,[...prefix,choice.id]);
    const suffix={choices:[choice.id,...childSuffix.choices],ending:childSuffix.ending};
    firstSuffix??=suffix;
    if(!choiceWitnesses.has(choice.id))choiceWitnesses.set(choice.id,{route:[...prefix,...suffix.choices],ending:suffix.ending});
  }
  assert(legal>0 && firstSuffix,`zero permitted choices: ${state.sceneId}`);
  active.delete(stateKey);memo.set(stateKey,firstSuffix);return firstSuffix;
}
solve(boundary(beginAt()),[]);
assert.deepEqual([...choiceWitnesses.keys()].sort(),[...EXPECTED_CHOICES].sort(),'unreachable source choices');
assert.deepEqual([...endingWitnesses.keys()].sort(),[...EXPECTED_ENDINGS].sort(),'unreachable endings');
assert.deepEqual([...visitedScenes].sort(),scenes.map(s=>s.id).sort(),'unvisited source scenes');
for(const [choiceId,witness] of choiceWitnesses){
  assert(witness.route.includes(choiceId));
  const ending=play(witness.route);
  assert.equal(ending.sceneId,witness.ending,`witness replay fails: ${choiceId}`);
  finishEnding(ending);
}
for(const [endingId,witness] of endingWitnesses){
  const ending=play(witness.route);assert.equal(ending.sceneId,endingId);finishEnding(ending);
}

async function filesUnder(directory:string):Promise<string[]>{
  const result:string[]=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const path=join(directory,entry.name);
    if(entry.isDirectory())result.push(...await filesUnder(path));
    else if(/\.(?:ts|json)$/.test(entry.name))result.push(path);
  }
  return result;
}
const inputPaths=[
  ...await filesUnder(resolve('src/content')),...await filesUnder(resolve('src/engine')),
  resolve('tests/fixtures/decision-oracle.ts'),resolve('tests/helpers/engine-walk.ts'),
  resolve('scripts/verify-reachability.ts'),resolve('package-lock.json'),
].sort();
const digest=createHash('sha256');
for(const path of inputPaths){digest.update(relative(process.cwd(),path).replaceAll('\\','/'));digest.update('\0');digest.update(await readFile(path));digest.update('\0');}
const sourceBytes=await readFile(resolve('source/마지막_확인_전체_시나리오.md'));
assert.equal(createHash('sha256').update(sourceBytes).digest('hex'),SOURCE_BASIS.sha256);
const summary={
  decisionClasses,terminalClasses,allowedEdges,rejectedEdges,
  reachableScenes:visitedScenes.size,reachableChoices:choiceWitnesses.size,reachableEndings:endingWitnesses.size,
  deadEnds:0,sceneLoops:0,stateLoops:0,witnessReplays:choiceWitnesses.size+endingWitnesses.size,
  terminalClassesByEnding:Object.fromEntries([...terminalByEnding].sort(([a],[b])=>a.localeCompare(b))),
  commonEvidenceInvariants:{CH07_S03_E06:checkedCommonE06,CH08_S01_E09:checkedCommonE09},
};
const report={
  schemaVersion:1,source:SOURCE_BASIS,inputSha256:digest.digest('hex'),node:process.version,
  retainedState:['scene/stage/block/cursor/display','all evidence','all deductions','all flags',`predicate trust: ${trustIds.join(',')}`,'effects still referenced by current/future scenes','current-scene resolved variants','current-scene choice-resolution guard'],
  omittedState:{
    unrelatedRelations:'All predicates were traversed; only named trust can affect guards/variants. Other trust and all suspicion are independent arithmetic and never branch inputs.',
    pastEffects:'Only effects absent from the statically checked future effect closure are omitted.',
    pastChoicesAndVariants:'Unique block IDs and an acyclic scene graph prevent reuse; the current choice guard and current-scene variants are retained.',
    disclosuresAndLog:'Actual blocks and disclosure effects still execute. These fields are not read by predicates, effect arithmetic, or scene navigation.',
    identifiersAndRevision:'runId/parentRunId/revision affect log/save identity, not permissions or outcome.',
    seed:'Choice-ID order only; every permitted ID is explored. Engine decisions do not consume seed.',
    TITLE:'Intentional new-run screen command is excluded from single-run loops; each ending is executed through the closing block to TITLE readiness.',
  },
  summary,
  endings:Object.fromEntries([...endingWitnesses].sort(([a],[b])=>a.localeCompare(b))),
  choices:Object.fromEntries([...choiceWitnesses].sort(([a],[b])=>a.localeCompare(b))),
};
await writeFile(resolve('docs/REACHABILITY_WITNESSES.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({result:'pass',...summary,report:'docs/REACHABILITY_WITNESSES.json'}));

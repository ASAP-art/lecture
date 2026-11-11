import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { GAME_INDEX } from '../src/content/game-content';
import { blockText, currentBlock } from '../src/engine/gameplay';
import type { RuntimeGameState } from '../src/engine/state';
import { DEDUCTION_RULES, CORE_EVIDENCE, PROOF_DEDUCTIONS, TRUE_WITNESS, expectedAllowed, expectedEnding, expectedProof, meetsDeduction } from './fixtures/decision-oracle';
import { advance, assertDeniedUnchanged, beginAt, choiceState, finishResult, play, select, toBoundary } from './helpers/engine-walk';

const sourceLines=readFileSync(new URL('../source/마지막_확인_전체_시나리오.md',import.meta.url),'utf8').split(/\r?\n/);
const sourceText=(range: readonly number[])=>sourceLines.slice(range[0]!-1,range[1]).join('\n');
const sorted=(set:ReadonlySet<string>)=>[...set].sort();

describe('independent scenario decision oracle',()=>{
  for(const rule of DEDUCTION_RULES){
    it(`${rule.id}: exhausts its independent prerequisite truth table, including incomplete results`,()=>{
      const base=choiceState(rule.scene);
      const bits=rule.evidence.length+rule.deductions.length+rule.flags.length;
      for(let mask=0;mask<(1<<bits);mask++){
        let bit=0;
        const evidence=rule.evidence.filter(()=>Boolean(mask & (1<<bit++)));
        const deductions=rule.deductions.filter(()=>Boolean(mask & (1<<bit++)));
        const flags=Object.fromEntries(rule.flags.map(id=>[id,Boolean(mask & (1<<bit++))]));
        const before:RuntimeGameState={...base,evidence:new Set(evidence),deductions:new Set(deductions),flags:{...base.flags,...flags}};
        const complete=meetsDeduction(before,rule);
        assert(expectedAllowed(rule.choice,before));
        const selected=select(before,rule.choice);
        assert.deepEqual(sorted(selected.deductions),sorted(new Set([...deductions,...(complete?[rule.id]:[])])),`${rule.id} mask ${mask}`);
        assert.deepEqual(selected.evidence,before.evidence,'deduction choice auto-fills missing evidence');
        if(rule.id==='D5')assert.equal(selected.flags.FLAG_FINAL_CHAIN,complete);
        if('incomplete' in rule){
          const actualText=blockText(currentBlock(selected,GAME_INDEX)!,selected);
          assert.equal(actualText,sourceText(complete?rule.complete:rule.incomplete),`${rule.id} must show the ${complete?'complete':'incomplete'} source result; mask ${mask}`);
          const after=advance(selected);
          const newNotes=[...after.revealedNotebookEntries].filter(id=>!selected.revealedNotebookEntries.has(id));
          assert.deepEqual(newNotes.map(id=>GAME_INDEX.notebookEntries.get(id)!.body),[actualText],'notebook discloses a different result variant');
        }
      }
    },60_000);
  }

  it('exhausts 65,536 final-input combinations against the independent proof/full definitions',()=>{
    const base=choiceState('CH10_S02');
    for(let evidenceMask=0;evidenceMask<128;evidenceMask++){
      const evidence=new Set(CORE_EVIDENCE.filter((_,i)=>evidenceMask & (1<<i)));
      for(let deductionMask=0;deductionMask<32;deductionMask++){
        const previous=PROOF_DEDUCTIONS.filter((_,i)=>deductionMask & (1<<i));
        for(let flags=0;flags<16;flags++){
          const state:RuntimeGameState={...base,evidence,deductions:new Set([...previous,...(flags&2?['D6']:[])]),flags:{...base.flags,FLAG_FINAL_CHAIN:Boolean(flags&1),FLAG_RETURN_AGENCY:Boolean(flags&4),FLAG_RESTORED:Boolean(flags&8)}};
          for(const choice of ['C24_A','C24_B','C24_C']){
            const expected=expectedEnding(choice,state);
            if(expected===null){assertDeniedUnchanged(state,choice);continue;}
            const result=finishResult(select(state,choice));
            assert.equal(result.sceneId,expected,`${choice} E=${evidenceMask} D=${deductionMask} flags=${flags}`);
            assert.equal(result.flags.FLAG_OUTCOME,expected.replace('END_',''));
          }
        }
      }
    }
  },120_000);

  it('C11_B still reaches GOOD without the private family evidence',()=>{
    const route=TRUE_WITNESS.map(id=>id==='C11_A'?'C11_B':id==='C21_A'?'C21_B':id);
    const ending=play(route);
    assert.equal(ending.sceneId,'END_GOOD');
    for(const id of ['E12','E14','E15'])assert(!ending.evidence.has(id));
    assert(expectedProof(ending));
  });

  it('D6 cannot substitute for missing proof on an actual route',()=>{
    const ending=play(TRUE_WITNESS.map(id=>id==='C12_A'?'C12_B':id));
    assert(ending.deductions.has('D6'));
    assert(!ending.deductions.has('D1'));
    assert(!ending.deductions.has('D5'));
    assert.equal(ending.sceneId,'END_BAD01');
  });

  for(const earlier of ['C14_B','C14_C'])for(const later of ['C16_A','C16_B']){
    it(`${earlier} -> ${later} cannot earn both D2 and D4`,()=>{
      const route=TRUE_WITNESS.map(id=>id==='C14_A'?earlier:id==='C16_A'?later:id);
      const ending=play(route);
      assert.equal(ending.deductions.has('D2'),later==='C16_A');
      assert.equal(ending.deductions.has('D4'),later==='C16_B');
      assert.equal(ending.sceneId,'END_BAD01');
    });
  }

  it('C15 never repairs E04 and E07 simultaneously after both earlier analyses were missed',()=>{
    const prefix=TRUE_WITNESS.slice(0,14).map(id=>id==='C04_A'?'C04_B':id==='C09_A'?'C09_B':id);
    let state=toBoundary(beginAt());
    for(const choice of prefix)state=toBoundary(select(state,choice));
    assert.equal(state.sceneId,'CH07_S01');
    assert(!state.evidence.has('E04')&&!state.evidence.has('E07'));
    for(const [choice,expected] of [['C15_A',['E07']],['C15_B',['E04']],['C15_C',[]]] as const){
      const result=select(state,choice);
      assert.deepEqual(['E04','E07'].filter(id=>result.evidence.has(id)),expected);
    }
  });
});

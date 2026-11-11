// Independently transcribed from the preserved scenario, not from runtime conditions/effects.
export const SOURCE_BASIS = {
  sha256: '66e7358249200fd6624e03f7f818a9c1a0f434cb3ca032c3ef1c89b148fa7336',
  deductionLines: [197, 202],
  endingRuleLines: [1962, 1985],
  tradeoffLines: [1927, 1940],
} as const;

export interface OracleState {
  readonly evidence: ReadonlySet<string>;
  readonly deductions: ReadonlySet<string>;
  readonly flags: Readonly<Record<string, unknown>>;
  readonly relations: Readonly<Record<string, { readonly trust: number }>>;
}
export const CORE_EVIDENCE = ['E03', 'E04', 'E05', 'E06', 'E07', 'E09', 'E10'] as const;
export const PROOF_DEDUCTIONS = ['D1', 'D2', 'D3', 'D4', 'D5'] as const;
export const FAMILY_EVIDENCE = ['E12', 'E14', 'E15', 'E16'] as const;
export const EXPECTED_ENDINGS = ['END_TRUE', 'END_GOOD', 'END_BAD01', 'END_BAD02'] as const;
export const EXPECTED_CHOICES = [
  'C01_A','C01_B','C02_A','C02_B','C03_A','C03_B','C04_A','C04_B',
  'C05_A','C05_B','C06_A','C06_B','C06_C','C07_A','C07_B','C08_A','C08_B',
  'C09_A','C09_B','C10_A','C10_B','C10_C','C11_A','C11_B','C12_A','C12_B',
  'C13_A','C13_B','C14_A','C14_B','C14_C','C15_A','C15_B','C15_C','C16_A','C16_B',
  'C17_A','C17_B','C18_A','C18_B','C19_A','C19_B','C20_A','C20_B','C20_C',
  'C21_A','C21_B','C22_A','C22_B','C23_A','C23_B','C24_A','C24_B','C24_C',
] as const;

export const DEDUCTION_RULES = [
  { id:'D1', choice:'C12_A', scene:'CH05_S03', evidence:[], deductions:[], flags:[] },
  { id:'D2', choice:'C16_A', scene:'CH07_S02', evidence:['E07'], deductions:[], flags:[], complete:[1080,1086], incomplete:[1092,1094] },
  { id:'D3', choice:'C17_A', scene:'CH07_S03', evidence:['E04','E06'], deductions:[], flags:[], complete:[1130,1136], incomplete:[1142,1144] },
  { id:'D4', choice:'C18_A', scene:'CH08_S01', evidence:['E09','E10'], deductions:[], flags:[], complete:[1184,1190], incomplete:[1196,1198] },
  { id:'D5', choice:'C20_A', scene:'CH08_S03', evidence:CORE_EVIDENCE, deductions:['D1','D2','D3','D4'], flags:['FLAG_RESTORED'], complete:[1283,1291], incomplete:[1297,1297] },
  { id:'D6', choice:'C23_A', scene:'CH10_S01', evidence:FAMILY_EVIDENCE, deductions:[], flags:[], complete:[1456,1460], incomplete:[1466,1468] },
] as const;
export type DeductionRule = typeof DEDUCTION_RULES[number];
export function meetsDeduction(state: OracleState, rule: DeductionRule): boolean {
  return rule.evidence.every(id=>state.evidence.has(id)) &&
    rule.deductions.every(id=>state.deductions.has(id)) &&
    rule.flags.every(id=>state.flags[id] === true);
}
export function expectedProof(state: OracleState): boolean {
  return state.flags.FLAG_FINAL_CHAIN === true &&
    PROOF_DEDUCTIONS.every(id=>state.deductions.has(id)) &&
    CORE_EVIDENCE.every(id=>state.evidence.has(id));
}
export function expectedFull(state: OracleState): boolean {
  return expectedProof(state) && state.deductions.has('D6') && state.flags.FLAG_RETURN_AGENCY === true;
}
export function expectedAllowed(choice: string, state: OracleState): boolean {
  switch(choice) {
    case 'C11_A': return (state.relations.CHAR_EUNSEO?.trust ?? 0) >= 1;
    case 'C21_A': return state.flags.FLAG_PRIVATE_ACCESS === true;
    case 'C24_B': return !state.evidence.has('E07') && !state.deductions.has('D3');
    case 'C24_C': return !expectedProof(state);
    default: return true;
  }
}
export function expectedEnding(choice: string, state: OracleState): string | null {
  if(!expectedAllowed(choice,state)) return null;
  switch(choice) {
    case 'C24_A': return expectedFull(state)?'END_TRUE':expectedProof(state)?'END_GOOD':'END_BAD01';
    case 'C24_B': return 'END_BAD02';
    case 'C24_C': return 'END_BAD01';
    default: return null;
  }
}

export const TRUE_WITNESS = [
  'C01_A','C02_A','C03_B','C04_A','C05_B','C06_C','C07_A','C08_A','C09_A','C10_A','C11_A','C12_A',
  'C13_A','C14_A','C15_C','C16_A','C17_A','C18_A','C19_A','C20_A','C21_A','C22_A','C23_A','C24_A',
] as const;

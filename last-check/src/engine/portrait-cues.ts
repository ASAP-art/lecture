import type { BlockId, SceneId } from '../content/ids';
import type { SpriteAssetId } from './sprite-assets';

/** Current-block staging only; disclosures never extend a pose into later dialogue. */
export const PORTRAIT_CUES: readonly {
  sceneId: SceneId;
  blockIds: readonly BlockId[];
  assetId: SpriteAssetId;
  disclosedBy?: BlockId;
  variantId?: string;
  liveBackgroundId?: 'bg_interview' | 'bg_guard_room' | 'bg_corridor' | 'bg_archive';
  action: string;
}[] = [
  {
    sceneId: 'CH01_S02',
    blockIds: ['BLK_CH01_S02_06'],
    assetId: 'char_yikyung_looking_at_key',
    disclosedBy: 'BLK_CH01_S02_01',
    action: '무릎 위에 놓인 열쇠를 내려다보는 이경',
  },
  {
    sceneId: 'CH01_S02',
    blockIds: ['BLK_CH01_S02_08'],
    assetId: 'char_dohyun_sliding_casefile',
    action: '얇은 사건 개요를 서진 쪽으로 미는 도현',
  },
  {
    sceneId: 'CH02_S02',
    blockIds: ['BLK_CH02_S02_09', 'BLK_CH02_S02_10'],
    assetId: 'char_junseok_pointing_blueprint',
    disclosedBy: 'BLK_CH02_S02_01',
    liveBackgroundId: 'bg_interview',
    action: '펼친 도면의 두 지점 사이를 짚으며 설명하는 준석',
  },
  {
    sceneId: 'CH02_S02_B',
    blockIds: ['BLK_CH02_S02_B_01'],
    assetId: 'char_junseok_presenting_records',
    liveBackgroundId: 'bg_interview',
    action: '개선 요청 자료를 제출하겠다고 말하는 준석',
  },
  {
    sceneId: 'CH03_S02_A',
    blockIds: ['BLK_CH03_S02_A_04'],
    assetId: 'char_suhyun_comparing_lists',
    disclosedBy: 'BLK_CH03_S02_01',
    action: '두 종이가 포개지지 않도록 떨어뜨려 놓는 수현',
  },
  {
    sceneId: 'CH04_S01',
    blockIds: ['BLK_CH04_S01_08'],
    assetId: 'char_yikyung_reaching_paper',
    disclosedBy: 'BLK_CH04_S01_01',
    action: '종이에 손을 뻗었다가 멈추는 이경',
  },
  {
    sceneId: 'CH04_S02',
    blockIds: ['BLK_CH04_S02_02', 'BLK_CH04_S02_04', 'BLK_CH04_S02_06'],
    assetId: 'char_yikyung_confession',
    action: '자신이 했다는 진술을 단호하게 말하는 이경',
  },
  {
    sceneId: 'CH05_S01_B',
    blockIds: ['BLK_CH05_S01_B_03'],
    assetId: 'char_jihoo_hesitating',
    action: '말을 망설이며 사본이 남았겠다고 답하는 지후',
  },
  {
    sceneId: 'CH05_S02_B',
    blockIds: ['BLK_CH05_S02_B_05'],
    assetId: 'char_eunseo_packing_folder',
    action: '서류철을 다시 가방에 넣는 은서',
  },
  {
    sceneId: 'CH06_S01',
    blockIds: ['BLK_CH06_S01_12'],
    assetId: 'char_jihoo_staring_document',
    action: '한동안 종이에서 눈을 떼지 않는 지후',
  },
  {
    sceneId: 'CH06_S01_A',
    blockIds: ['BLK_CH06_S01_A_05'],
    assetId: 'char_dohyun_reviewing_screen',
    action: '통화 목록을 화면에 올려 확인하는 도현',
  },
  {
    sceneId: 'CH06_S02_B',
    blockIds: ['BLK_CH06_S02_B_01'],
    assetId: 'char_suhyun_receipt_stamp',
    action: '빈 양식에 접수 도장을 찍는 수현',
  },
  {
    sceneId: 'CH08_S01',
    blockIds: ['BLK_CH08_S01_01', 'BLK_CH08_S01_02'],
    assetId: 'char_jihoo_trembling_paper',
    action: '확인서 사본을 접지 않고 든 지후의 손에서 종이가 조금 떨리는 모습',
  },
  {
    sceneId: 'CH08_S02',
    blockIds: ['BLK_CH08_S02_07'],
    assetId: 'char_dohyun_marking_board',
    action: '화이트보드 아래에 작은 칸을 만드는 도현',
  },
  {
    sceneId: 'CH08_S03_A',
    blockIds: ['BLK_CH08_S03_A_RESULT'],
    assetId: 'char_yikyung_gripping_armrest',
    variantId: 'VAR_CH08_S03_A_COMPLETE',
    action: '의자 팔걸이를 꽉 잡는 이경',
  },
  {
    sceneId: 'CH09_S02_A',
    blockIds: ['BLK_CH09_S02_A_05'],
    assetId: 'char_yikyung_open_notebook',
    disclosedBy: 'BLK_CH09_S02_A_04',
    action: '가방에서 꺼내 펼친 작은 수첩을 든 이경',
  },
];

/** Supplied images without a safe current-block cue, including explicitly rejected art. */
export const UNUSED_SPRITE_REASONS: Readonly<Partial<Record<SpriteAssetId, string>>> = {
  char_jihoo_straightening_papers:
    '서류 모서리를 맞추는 유일한 행동은 CH03_S01_01의 CCTV 속 지후다. 추천 CH03_S01_B에는 현재 정리 행동이 없으며 해당 결과 장면은 CCTV CG가 우선하므로 현장 pose로 사용하지 않는다.',
  char_eunseo_guarding_document:
    '추천 CH03_S02_C에는 서류를 품에 안는 행동이 없다. CH03_S02_09도 문서 위에 손을 올릴 뿐이므로 그림에 맞추어 새로운 소지·보호 동작을 만들지 않는다.',
  char_eunseo_looking_down:
    '제공되었으나 인물 인상·화풍·작은 상반신 크롭·잔여배경 불일치로 rejected. 실제 시선을 내리는 CH03_S03_03에서도 기존 중립초상을 유지한다.',
  char_eunseo_offering_envelope:
    '제공되었으나 인물 인상·작은 크롭·잔여배경·소품 불일치로 rejected. 선택 전 CH09_S01_07은 이름을 가리는 동작이며, 문서 공개 경로도 기존 중립초상과 CG 우선권을 유지한다.',
  char_junseok_explaining_log:
    '제공되었으나 회색 머리 등 기존 중립초상과 인물 인상이 달라 rejected. 실제 작동 기록을 설명하는 CH07_S01_A_01과 _03에서도 기존 중립초상을 유지한다.',
  char_suhyun_stacking_cups:
    '제공되었으나 인물 인상·화풍·작은 상반신 크롭·잔여배경·소품 불일치로 rejected. 실제 종이컵을 쌓는 CH06_S02_01에서도 기존 중립초상을 유지한다.',
};

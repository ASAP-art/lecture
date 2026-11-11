# ART ASSETS & 82-SCENE VISUAL MAPPING

## 1. 원본·배포본 경계 원칙 (`D-012`)

- **원본 보관소 (`last-check/art-source/originals/`)**: Vite `public/` 밖의 비배포 원본 자산 디렉터리.
- **배포 자산 (`last-check/public/assets/`)**: 실제 파일 형식·알파 채널·해상도·비율·내용 대응을 검증한 뒤 런타임에서 참조하는 배포용 자산 디렉터리.
- **원칙**: 이미지 가이드는 연결 참고 기준이며 임의로 이미지를 재생성·합성·변형하지 않는다. 제공되지 않은 자산은 `unreceived`(`미수신`) 상태로 남기며, 저장·복원이나 장면 전환 시 이전 장면의 마지막 그림이 잔존해 누락 자산을 숨기지 않도록 매 장면·블록·분기마다 순수 함수(`resolveStageVisual`)로 즉시 재계산한다. 그림 로딩 성공·실패는 게임 상태 전이·효과와 완전히 무관하다.

---

## 2. 기준 3장 실제 파일 검증 결과 및 전체 자산 목록 (`ART_ASSETS`)

### 기존 수신 3종 (추가 §5–8, 현재 총 22종)

| 자산 ID (`ArtAssetId`) | 스키마 ID | 구분 | 실제 형식 / 색상 | 해상도 / 비율 | 알파 채널 | 원본 (`art-source/originals/`) | 배포본 (`public/assets/`) | SHA-256 | `object-fit` / `object-position` | 시각 내용 확인 |
|---|---|---|---|---|---|---|---|---|---|---|
| `bg_archive` | `ASSET_BG_ARCHIVE` | 배경 | PNG / 8-bit RGB (`colorType=2`) | `1672×941` (`≈16:9`, `1.7768`) | 없음 (불투명) | `art-source/originals/bg_archive.png` | `/assets/bg_archive.png` | `a7604a3c1ed150c1124e9e999358defa9edeef3e7a3d1a457795a05bf84791dc` | `cover` / `center center` | 지하 수장고 이동식 서가(핸들 휠), 선반의 보관 상자, 복도 끝 흰 가림막(`CH01_S01_01` 원문 일치) |
| `bg_interview` | `ASSET_BG_INTERVIEW` | 배경 | PNG / 8-bit RGB (`colorType=2`) | `1672×941` (`≈16:9`, `1.7768`) | 없음 (불투명) | `art-source/originals/bg_interview.png` | `/assets/bg_interview.png` | `a67b48b626cc724e1c15facf836aa2fddcf652098cf65f3548b8f8beb7f5204c` | `cover` / `center center` | 형광등과 반투명 유리 격벽이 있는 면담실, 중앙 테이블 위 갈색 서류철과 마주 보는 의자 두 개 |
| `char_yikyung_neutral` | `ASSET_CHAR_YIKYUNG_NEUTRAL` | 인물 초상 | PNG / 8-bit RGBA (`colorType=6`) | `1024×1536` (`2:3`, `0.6667`) | 있음 (배경 완전 투명 `alpha=0` 픽셀 742,013개) | `art-source/originals/char_yikyung_neutral.png` | `/assets/char_yikyung_neutral.png` | `9b5293cc1ce22e2a19adaf5efaa924ec89f667747e81e7e21198d654f2cd576a` | `contain` / `center bottom` | 50대 후반 한이경의 정면 중립 초상. 얼굴, 짙은 갈색 코트의 단추 3개, 아래쪽 모은 두 손까지 포함 (`contain` 적용으로 얼굴·손·코트 단추 잘림 방지) |

### 미수신 자산 (문서 3종 — `status: 'unreceived'`, 봉투 수신은 §7)

| 자산 ID (`ArtAssetId`) | 스키마 ID | 구분 | 상태 | 기본 `fit` / `position` | 비고 |
|---|---|---|---|---|---|
| `doc_roster_tags` | `ASSET_DOC_ROSTER_TAGS` | 문서 삽화 | 미수신 (`unreceived`) | `contain` / `center center` | 명부·출입 태그 대조 |
| `doc_safety_confirmation` | `ASSET_DOC_SAFETY_CONFIRMATION` | 문서 삽화 | 미수신 (`unreceived`) | `contain` / `center center` | 안전 확인서 원본 |
| `doc_independent_log` | `ASSET_DOC_INDEPENDENT_LOG` | 문서 삽화 | 미수신 (`unreceived`) | `contain` / `center center` | 독립 기록기 이력 |

---

## 3. 초기 82장면 배치 후보 명세 (`SCENE_VISUAL_MAPPINGS`)

결과 장면(`_A`, `_B`, `_C`)은 부모 선택 장면을 `inheritsFrom`으로 명시하며, 장면 기본 배경/초상과 블록 단위 전환(`blockId`, `before`/`after`, `condition`)을 선언적으로 정의한다.

아래 인물 `미수신` 표기는 최초 후보 작성 당시 기록이다. 현재 초상 6종은 모두 수신했으며 최신 파일 대응·현장 공개 필터는 §6을 따른다. 후보가 있어도 첫 현장 대사 전·문 너머·녹음·참고컷에서는 실제 DOM/alt에 만들지 않는다.
제목/자료/엔딩 컷의 현재 공개 정책과 전체22자산·82매핑 검수는 §7–8을 우선한다. 특히 엔딩 입장에는 엔딩 컷이 없고 BAD01 암전에서는 기본 배경도 제거한다.

| # | 장면 ID | 상속 (`inheritsFrom`) | 기본 배경 (`backgroundId`) | 기본 초상 (`portraitId`) | 장면 공개 조건 (`condition`) | 블록 전환 (`blockId` · `timing` · `condition` → 변경 대상) |
|---:|---|---|---|---|---|---|
| 1 | `CH01_S01` | `null` | `bg_archive` (수신) | `null` | — | `BLK_CH01_S01_02` (`before`) → `char_dohyeon_neutral`<br>`BLK_CH01_S01_08` (`before`) → `char_suhyeon_neutral` |
| 2 | `CH01_S01_A` | `CH01_S01` | `bg_archive` (수신) | `char_suhyeon_neutral` (미수신) | — | — |
| 3 | `CH01_S01_B` | `CH01_S01` | `bg_archive` (수신) | `char_dohyeon_neutral` (미수신) | — | — |
| 4 | `CH01_S02` | `null` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | `BLK_CH01_S02_09` (`before`) → `char_jihu_neutral`<br>`BLK_CH01_S02_10` (`after`) → `char_yikyung_neutral` |
| 5 | `CH01_S02_A` | `CH01_S02` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 6 | `CH01_S02_B` | `CH01_S02` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 7 | `CH02_S01` | `null` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | `BLK_CH02_S01_06` (`after`) → `char_suhyeon_neutral` |
| 8 | `CH02_S01_A` | `CH02_S01` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 9 | `CH02_S01_B` | `CH02_S01` | `bg_interview` (수신) | `char_suhyeon_neutral` (미수신) | — | — |
| 10 | `CH02_S02` | `null` | `bg_machine_room` (참고컷) | 참고컷 인물 숨김 | — | — |
| 11 | `CH02_S02_A` | `CH02_S02` | 부모 상속 (참고컷) | 참고컷 인물 숨김 | — | — |
| 12 | `CH02_S02_B` | `CH02_S02` | 부모 상속 (참고컷) | 참고컷 인물 숨김 | — | — |
| 13 | `CH03_S01` | `null` | `bg_safety_room` (영상 대조 참고컷) | 참고컷 인물 숨김 | — | — |
| 14 | `CH03_S01_A` | `CH03_S01` | 부모 상속 (참고컷) | 참고컷 인물 숨김 | — | — |
| 15 | `CH03_S01_B` | `CH03_S01` | 부모 상속 (참고컷) | 참고컷 인물 숨김 | — | — |
| 16 | `CH03_S02` | `null` | `bg_interview` (수신) | `char_suhyeon_neutral` (미수신) | — | `BLK_CH03_S02_06` (`before`) → `char_jihu_neutral`<br>`BLK_CH03_S02_09` (`before`) → `char_eunseo_neutral` |
| 17 | `CH03_S02_A` | `CH03_S02` | `bg_interview` (수신) | `char_suhyeon_neutral` (미수신) | — | — |
| 18 | `CH03_S02_B` | `CH03_S02` | `bg_interview` (수신) | `char_junseok_neutral` (미수신) | — | — |
| 19 | `CH03_S02_C` | `CH03_S02` | `bg_interview` (수신) | `char_eunseo_neutral` (미수신) | — | — |
| 20 | `CH03_S03` | `null` | `bg_interview` (수신) | `char_eunseo_neutral` (미수신) | — | — |
| 21 | `CH03_S03_A` | `CH03_S03` | `bg_interview` (수신) | `char_eunseo_neutral` (미수신) | — | — |
| 22 | `CH03_S03_B` | `CH03_S03` | `bg_interview` (수신) | `char_eunseo_neutral` (미수신) | — | — |
| 23 | `CH04_S01` | `null` | `bg_interview` (수신) | `char_jihu_neutral` (미수신) | — | `BLK_CH04_S01_08` (`before`) → `char_yikyung_neutral` |
| 24 | `CH04_S01_A` | `CH04_S01` | `bg_interview` (수신) | `char_jihu_neutral` (미수신) | — | `BLK_CH04_S01_A_05` (`before`) → `char_yikyung_neutral` |
| 25 | `CH04_S01_B` | `CH04_S01` | `bg_interview` (수신) | `char_suhyeon_neutral` (미수신) | — | — |
| 26 | `CH04_S02` | `null` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 27 | `CH04_S02_A` | `CH04_S02` | `bg_interview` (수신) | `char_junseok_neutral` (미수신) | — | `BLK_CH04_S02_A_06` (`before`) → `char_yikyung_neutral` |
| 28 | `CH04_S02_B` | `CH04_S02` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 29 | `CH05_S01` | `null` | `bg_interview` (수신) | `char_eunseo_neutral` (미수신) | — | `BLK_CH05_S01_08` (`before`) → `char_jihu_neutral` |
| 30 | `CH05_S01_A` | `CH05_S01` | `bg_interview` (수신) | `char_eunseo_neutral` (미수신) | — | — |
| 31 | `CH05_S01_B` | `CH05_S01` | `bg_interview` (수신) | `char_jihu_neutral` (미수신) | — | — |
| 32 | `CH05_S01_C` | `CH05_S01` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 33 | `CH05_S02` | `null` | `bg_interview` (수신) | `char_eunseo_neutral` (미수신) | — | — |
| 34 | `CH05_S02_A` | `CH05_S02` | `bg_interview` (수신) | `char_eunseo_neutral` (미수신) | `T은≥1` | — |
| 35 | `CH05_S02_B` | `CH05_S02` | `bg_interview` (수신) | `char_dohyeon_neutral` (미수신) | — | — |
| 36 | `CH05_S03` | `null` | `bg_analysis_room` (자료 대조 참고컷) | 참고컷 인물 숨김 | — | — |
| 37 | `CH05_S03_A` | `CH05_S03` | 부모 상속 (참고컷) | 참고컷 인물 숨김 | — | — |
| 38 | `CH05_S03_B` | `CH05_S03` | 부모 상속 (참고컷) | 참고컷 인물 숨김 | — | — |
| 39 | `CH06_S01` | `null` | `bg_interview` (수신) | `char_jihu_neutral` (미수신) | — | — |
| 40 | `CH06_S01_A` | `CH06_S01` | `bg_interview` (수신) | `char_jihu_neutral` (미수신) | — | — |
| 41 | `CH06_S01_B` | `CH06_S01` | `bg_interview` (수신) | `char_jihu_neutral` (미수신) | — | — |
| 42 | `CH06_S02` | `null` | `bg_guard_room` (수신, 실제 휴게실) | `char_suhyeon_neutral` (미수신) | — | — |
| 43 | `CH06_S02_A` | `CH06_S02` | 부모 상속 (휴게실) | `char_suhyeon_neutral` (미수신) | — | — |
| 44 | `CH06_S02_B` | `CH06_S02` | 부모 상속 (휴게실) | `char_suhyeon_neutral` (미수신) | — | — |
| 45 | `CH06_S02_C` | `CH06_S02` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 46 | `CH07_S01` | `null` | `bg_interview` (수신) | `char_dohyeon_neutral` (미수신) | — | `BLK_CH07_S01_05` (`before`) → `char_yikyung_neutral` |
| 47 | `CH07_S01_A` | `CH07_S01` | `bg_interview` (수신) | `char_junseok_neutral` (미수신) | — | — |
| 48 | `CH07_S01_B` | `CH07_S01` | `bg_interview` (수신) | `char_junseok_neutral` (미수신) | — | — |
| 49 | `CH07_S01_C` | `CH07_S01` | `bg_interview` (수신) | `char_suhyeon_neutral` (미수신) | — | — |
| 50 | `CH07_S02` | `null` | `bg_analysis_room` (자료 대조 참고컷) | 참고컷 인물 숨김 | — | — |
| 51 | `CH07_S02_A` | `CH07_S02` | 부모 상속 (참고컷) | 참고컷 인물 숨김 | — | — |
| 52 | `CH07_S02_B` | `CH07_S02` | 부모 상속 (참고컷) | 참고컷 인물 숨김 | — | — |
| 53 | `CH07_S03` | `null` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 54 | `CH07_S03_A` | `CH07_S03` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | `BLK_CH07_S03_A_RESULT` (`before`, `E04 & E06`) → `char_yikyung_neutral`<br>`BLK_CH07_S03_A_RESULT` (`before`, `!(E04 & E06)`) → `char_dohyeon_neutral` |
| 55 | `CH07_S03_B` | `CH07_S03` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 56 | `CH08_S01` | `null` | `bg_interview` (수신) | `char_jihu_neutral` (미수신) | — | — |
| 57 | `CH08_S01_A` | `CH08_S01` | `bg_interview` (수신) | `char_jihu_neutral` (미수신) | — | — |
| 58 | `CH08_S01_B` | `CH08_S01` | `bg_interview` (수신) | `char_jihu_neutral` (미수신) | — | — |
| 59 | `CH08_S02` | `null` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 60 | `CH08_S02_A` | `CH08_S02` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 61 | `CH08_S02_B` | `CH08_S02` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 62 | `CH08_S03` | `null` | `bg_interview` (수신) | `char_dohyeon_neutral` (미수신) | — | — |
| 63 | `CH08_S03_A` | `CH08_S03` | `bg_interview` (수신) | `char_dohyeon_neutral` (미수신) | — | `BLK_CH08_S03_A_RESULT` (`before`, 완성 논증 조건) → `char_yikyung_neutral` |
| 64 | `CH08_S03_B` | `CH08_S03` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 65 | `CH08_S03_C` | `CH08_S03` | `bg_interview` (수신) | `char_dohyeon_neutral` (미수신) | — | — |
| 66 | `CH09_S01` | `null` | `bg_corridor` (수신) | `char_eunseo_neutral` (미수신) | — | — |
| 67 | `CH09_S01_A` | `CH09_S01` | `bg_corridor` (수신) | `char_eunseo_neutral` (미수신) | `private_access` | — |
| 68 | `CH09_S01_B` | `CH09_S01` | `bg_corridor` (수신) | `char_eunseo_neutral` (미수신) | — | — |
| 69 | `CH09_S02` | `null` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 70 | `CH09_S02_A` | `CH09_S02` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 71 | `CH09_S02_B` | `CH09_S02` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 72 | `CH10_S01` | `null` | `bg_interview` (수신) | `char_dohyeon_neutral` (미수신) | — | — |
| 73 | `CH10_S01_A` | `CH10_S01` | `bg_interview` (수신) | `char_dohyeon_neutral` (미수신) | — | — |
| 74 | `CH10_S01_B` | `CH10_S01` | `bg_interview` (수신) | `char_dohyeon_neutral` (미수신) | — | — |
| 75 | `CH10_S02` | `null` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 76 | `CH10_S02_A` | `CH10_S02` | `bg_interview` (수신) | `char_jihu_neutral` (미수신) | — | — |
| 77 | `CH10_S02_B` | `CH10_S02` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | — |
| 78 | `CH10_S02_C` | `CH10_S02` | `bg_interview` (수신) | `char_dohyeon_neutral` (미수신) | — | — |
| 79 | `END_TRUE` | `null` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | `BLK_END_TRUE_10` (`before`) → `char_jihu_neutral`<br>`BLK_END_TRUE_16` (`before`) → `char_yikyung_neutral`<br>`BLK_END_TRUE_17` (`before`) → `char_jihu_neutral`<br>`BLK_END_TRUE_26` (`before`) → `char_yikyung_neutral`<br>`BLK_END_TRUE_62` (`before`) → `char_jihu_neutral`<br>`BLK_END_TRUE_66` (`before`) → `portrait: null` |
| 80 | `END_GOOD` | `null` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | `BLK_END_GOOD_12` (`before`) → `char_jihu_neutral`<br>`BLK_END_GOOD_15` (`before`) → `char_yikyung_neutral`<br>`BLK_END_GOOD_27` (`before`) → `char_eunseo_neutral`<br>`BLK_END_GOOD_32` (`before`) → `portrait: null` |
| 81 | `END_BAD01` | `null` | `bg_interview` (수신) | `char_dohyeon_neutral` (미수신) | — | `BLK_END_BAD01_10` (`before`) → `bg_corridor`, `char_yikyung_neutral`<br>`BLK_END_BAD01_20` (`before`) → `bg_interview`, `char_dohyeon_neutral`<br>`BLK_END_BAD01_25` (`before`) → `portrait: null` |
| 82 | `END_BAD02` | `null` | `bg_interview` (수신) | `char_yikyung_neutral` (수신) | — | `BLK_END_BAD02_09` (`before`) → `bg_corridor`, `char_yikyung_neutral`<br>`BLK_END_BAD02_19` (`before`) → `bg_interview`, `char_dohyeon_neutral`<br>`BLK_END_BAD02_31` (`before`) → `bg_interview`, `char_yikyung_neutral`<br>`BLK_END_BAD02_37` (`before`) → `portrait: null` |

## 4. 이전 3종 연결·공개·검증 결과 (추가 배경 검증은 §5)

- `src/engine/visuals.ts` → `src/ui/StageArt.tsx` → `App.tsx`로 연결했다. 결과 장면은 실제 `choiceHistory.resultSceneId`가 있어야 표시한다. 타이틀/입장 전 스냅샷은 중립 영역이다.
- 부모의 기본 레이어만 상속한다. 부모 블록 이벤트는 상속하지 않는다. `before`는 현재 또는 완료 공개 블록, `after`는 `revealedBlocks` 완료 이후만 적용한다. 건너뛴 블록은 커서 위치만으로 공개하지 않는다.
- 표의 CH07_S03_A/CH08_S03_A 조건은 저장된 `resolvedVariants`에 대응한다. 효과 적용 후 evidence/flags로 다시 판정하지 않는다. 복원도 같은 상태에서 재계산하며 이미지·로딩 상태는 저장하지 않는다.
- 제공되지 않은 편지·문서·수첩·엔딩 삽화는 DOM/alt/요청에 생성하지 않는다. 로딩 중 이미지는 숨기고 alt를 비우며 실패 이미지는 제거한다. 실행·장면·URL별 React key로 옛 요청이 새 그림을 덮지 못하게 한다.
- 이번 검사: 타입·원문 해시/82장면/54선택 검증·resolver/수첩 단위 10개·Playwright smoke 2개 통과. 최종 프로덕션 빌드 142모듈 성공(JS 837.49kB, 500kB 경고 유지).
- 실제 Chromium PC 1280×960/모바일 390×844에서 얼굴·손·코트 단추·진행 버튼 보존, 가로 넘침 없음 확인. 이미지 전부 실패 후 진행 가능·지연 초상 로딩 후 옛 그림 미복귀·로딩 전후 저장 상태 불변·새로고침 복원 확인.
- 미수신 14종, 전 82장면의 개별 육안 검수, 사람 플레이·실배포는 미검증/미완료. 전체 E2E·도달성 재탐색은 이번 범위에서 재실행하지 않았다.

## 5. 추가 배경 5종 — 배포·사용 조건 및 검증

### 파일·버전

- 원본: `art-source/originals/<제공 파일명>.png`에 변경 없이 보존. 배포본: `public/assets/<이름>.<배포 SHA-256 앞 12자리>.webp`. 기존 PNG 3종은 이번에 재인코딩하지 않았다.
- 5장 모두 실제 PNG signature·8-bit RGB·알파 없음·1672×941(1.7768:1) 확인. 원본 5장 모두 1MB 초과를 검토한 뒤, 해상도·소품·구도를 유지하는 무크롭 WebP quality 0.94로 변환했다. 리사이즈·합성·문자 삽입 없음.
- 배포본은 실제 RIFF/WEBP signature, 브라우저 디코딩 1672×941, MIME `image/webp`, HTTP 200 확인. 모두 `contain / center center`; 모바일에서도 전화기·기계 외함·컵·프린터·의자/상자를 자르지 않는다. 용량 하한 200KB에 맞추려고 파일을 부풀리지 않았다.
- base `/lecture/last-check/`를 사용한다. 원본/배포본 파일명 대소문자와 실제 경로 일치, `dist/assets/` 복사본 바이트 일치 확인. 자산 변경은 해시 파일명 교체로 구분하며 저장 상태에는 URL/이미지/버전을 넣지 않는다.

| 자산 ID / 스키마 ID | 제공 원본명 | 원본 바이트 / SHA-256 앞 12자리 | 배포 파일명 / 버전 | 배포 바이트 |
|---|---|---|---|---:|
| `bg_machine_room` / `ASSET_BG_MACHINE_ROOM` | `bg_machine.png` | 2,038,753 / `c6a3d95d669c` | `bg_machine.a0324e37027d.webp` | 209,122 |
| `bg_safety_room` / `ASSET_BG_SAFETY_ROOM` | `bg_safety.png` | 2,012,534 / `0e11c3a5e1ec` | `bg_safety.f956c6f93b77.webp` | 158,978 |
| `bg_analysis_room` / `ASSET_BG_ANALYSIS_ROOM` | `bg_analysis.png` | 2,083,660 / `cee2d21168a2` | `bg_analysis.cf6ca1d94488.webp` | 203,016 |
| `bg_corridor` / `ASSET_BG_CORRIDOR` | `bg_corridor.png` | 2,117,940 / `78b22537f24c` | `bg_corridor.b0b638a3994e.webp` | 216,486 |
| `bg_guard_room` / `ASSET_BG_GUARD_ROOM` | `bg_breakroom.png` | 2,013,792 / `0fa2fa3b56d2` | `bg_breakroom.ee89bf130ab6.webp` | 178,762 |

### 현재 사용 조건

| 배경 | 적용 장면·상속 | 실제 장소 / 설명 참고컷 | 원문 근거·제한 |
|---|---|---|---|
| 기계실 | `CH02_S02`, 결과 A/B 상속 | 설비 설명 참고컷 | 원문 384–398행은 도면을 펴고 운용 설명. 기계실로 이동했다는 사건을 추가하지 않는다. 참고컷 문구 표시, 인물 초상 숨김 |
| 안전실 | `CH03_S01`, 결과 A/B 상속 | 영상 대조용 공간 참고컷 | 436–450행은 모니터 영상 대조. 이 그림은 원본 CCTV·과거 사건 재현·인물 알리바이 증명이 아님을 표시. 인물 초상 숨김 |
| 분석실 | `CH05_S03`, `CH07_S02`, 각 결과 A/B 상속 | 자료 대조 참고컷 | 828행 수첩의 두 줄, 1060행 시간표 카드 대조. 새 분석실 이동을 만들지 않는다. 인물 초상 숨김 |
| 휴게실 | `CH06_S02`, 결과 A/B 상속 | 실제 휴게실 장면 | 938행의 종이컵 세 개. 기존 ID `bg_guard_room`을 유지하되 그림·alt·설명은 휴게실로만 표시. 경비실 녹음/근무 장면의 사실 재현으로 쓰지 않는다 |
| 복도 | `CH09_S01`, 결과 A/B, 기존 `END_BAD01_10`·`END_BAD02_09` 블록 전환 | 원문 복도 장면 | 1330행 도시락과 대기 의자. 그림 속 상자에서 편지 내용·수령인·증거를 추론시키지 않는다. 기존 엔딩 전환 시점 유지 |

- HAND/관리자/문서/명단/시각은 원문 대사·문서 블록의 HTML로만 읽는다. 그림의 빈 화면·종이·화이트보드에 판정 텍스트를 구워 넣거나 가짜 작동 상태/시간을 생성하지 않는다. 공개 이력·확정 variant·C15 규칙은 변경하지 않았다.
- 부모의 참고컷 모드/설명도 상속하되 자식이 다른 배경을 명시하면 이전 설명을 가져오지 않는다. `CH06_S02_C`의 기존 면담실 배경은 그대로 두며 휴게실 설명을 잘못 상속하지 않는다.
- 이번 5장 미사용 파일 0개. 미수신은 초상 5종·문서 4종=9종. 별도 경비실 전용 그림은 없으므로 휴게실 이미지를 경비실로 가장하지 않는다. 분석실은 위 자료 대조 장면 외에 임의로 확장하지 않았다.

### 이번 검사

- 타입 검사, resolver 6개, 원문 SHA/82장면/54선택 검증, Vite build(142모듈) 통과. JS 840.10KB로 기존 500KB 권고 경고 유지.
- 실제 프로덕션 preview에서 대표 5장면 PC 1280×960 시각 확인, 모바일 390×844 프레이밍/가로 넘침 없음 확인(기계실·휴게실 모바일 육안 포함). 소품은 무크롭이며 진행 버튼과 설명 문구가 겹치지 않는다.
- 대표 5개 도달 상태 새로고침 복원 시 저장 게임 상태 바이트 동등 확인. 기계실 결과 C04_A에서 HAND·관리자 원문 HTML과 참고컷 구분, 참고컷 인물 미표시 확인.
- 전 82장면 육안·전체 E2E·전체 도달성 재탐색·사람 플레이·실배포는 이번에 수행하지 않았다. 새 그림·장소이동 사건·Google 모델 호출 없음.
- 참고컷 상속 회귀는 실제 수신 초상이 있는 `C16_A`에서도 인물 숨김을 확인하고, `C14_C`의 다른 배경에서는 휴게실 설명을 초기화하며 기존 이경 초상은 보존하는 경계를 포함한다.

## 6. 인물 5종 추가 — 기존 한이경 보존

- 총 수신 13종(배경 7·초상 6), 미수신 문서 4종. 아래 파일은 모두 실제 PNG RGBA, 1024×1536(2:3), 투명 배경이며 체크무늬가 구워진 파일은 없다. 헤더뿐 아니라 디코딩 픽셀의 알파 0·부분 알파·네 모서리 알파를 검사했다.
- 원본은 `art-source/originals/<제공명>.png`, 배포본은 `public/assets/<제공명>.<SHA-256 앞 12자리>.png`. 얼굴·의상·알파를 바꾸지 않도록 재인코딩·배경 제거·생성 없이 바이트 그대로 복제했다. 원본 1MB 초과(1.78–1.98MB)는 검토 후 보존했으며 압축은 이번에 하지 않았다.
- 기존 `char_yikyung_neutral.png` 배포 해시 `9b5293cc1ce22e2a19adaf5efaa924ec89f667747e81e7e21198d654f2cd576a` 일치. 기존 한이경 원본/배포 파일과 기본 배치는 유지한다.

| 제공 파일명 → 자산 ID / 스키마 ID | 바이트 / SHA-256 앞 12자리 | 알파 0 픽셀 / 부분 알파 픽셀 | 얼굴·의상 대응 |
|---|---|---|---|
| `char_dohyun_neutral.png` → `char_dohyeon_neutral` / `ASSET_CHAR_DOHYEON_NEUTRAL` | 1,848,413 / `f6dfe34b531d` | 729,405 / 843,459 | 박도현, 짧은 검은 머리·남색 재킷·회색 니트 |
| `char_jihoo_neutral.png` → `char_jihu_neutral` / `ASSET_CHAR_JIHU_NEUTRAL` | 1,978,106 / `30d0be0c641f` | 749,585 / 823,279 | 정지후, 검은 머리·회색 셔츠·검은 바지 |
| `char_eunseo_neutral.png` → `char_eunseo_neutral` / `ASSET_CHAR_EUNSEO_NEUTRAL` | 1,863,703 / `3f6c621f8a94` | 724,749 / 848,115 | 최은서, 어깨 길이 머리·올리브 재킷·회색 니트 |
| `char_junseok_neutral.png` → `char_junseok_neutral` / `ASSET_CHAR_JUNSEOK_NEUTRAL` | 1,871,787 / `1f68a9d87435` | 739,065 / 833,799 | 오준석, 중년 남성·회색 작업 재킷 |
| `char_suhyun_neutral.png` → `char_suhyeon_neutral` / `ASSET_CHAR_SUHYEON_NEUTRAL` | 1,776,280 / `c5bf2a73ce54` | 757,138 / 815,726 | 배수현, 짧은 머리·남색 작업 재킷·회색 니트 |

- 네 모서리 알파는 5장 모두 0이며, 완전 불투명(alpha 255) 픽셀은 0이다. 따라서 인물 내부까지 완전 불투명하다고 보고하지 않는다. 실제 합성에서 배경 비침·체크무늬 사각 배경은 보이지 않았다.
- **문제 파일:** 위 5장 모두 귀·머리카락 등 외곽에 미세한 붉은 잔색이 원본에 있다. 프리뷰 크기에서는 비차단 사항이며 독립 적용했다. 임의 보정/재생성은 하지 않았다. 얼굴·손은 제공 범위 그대로 유지하며 원본에 없는 하체를 만들지 않는다.

### 현장·공개 조건

- 기존 장면/블록 후보를 유지하되 새 인물은 해당 장면의 실제 `dialogue.speakerId`가 현재 블록 또는 완료 공개 블록에서 확인된 후에만 배치한다. 결과 장면은 실제 선택한 부모의 완료 현장 대사도 허용한다. 과거 다른 장면에서 이름만 읽었다는 이유로 현재 장소에 배치하지 않는다.
- `CH01_S02_09/10` 지후는 문 반대편 목소리이므로 숨긴다. `CH05_S01_02` 피해자 메시지, `CH06_S01_06/07` 태오/지후 녹음, `CH06_S02_A_01/02` 수현/지후 녹음에서는 초상·alt를 생성하지 않는다. `CH06_S02_A_04` 현장 수현 대사에서는 수현만 복귀한다.
- `CH03_S01` 안전실 영상 참고컷과 기계실/분석실 참고컷에는 인물을 세우지 않는다. 피해자 강태오 초상·생존 면담·이동 사건을 추가하지 않았다. 대사·선택·확정 variant·공개/저장 상태는 변경하지 않는다.
- 대표 실제 적용: 도현 `CH01_S01_02`, 지후 `CH08_S01_02`, 은서 `CH09_S01_02`, 준석 `CH07_S01_A_01`, 수현 `CH06_S02_02`. 이번 5종 미사용 0. 자세는 중립 초상 UI이며 원문 좌석/동작을 새로 재연하지 않는다.

### 크기·레이어·검사

- 기존 한이경과 동일한 `contain / center bottom`, 우측 `min(55%,360px)`, 그림 영역 높이 범위 안에서 표시한다. 배경 뒤·초상 앞 순서, 대사·선택은 별도 아래 흐름. 새로운 확대/깊이 효과·가림·확대 크롭 없음.
- PC 1280×960 대표 5종 육안 검수: 얼굴·의상·양손·원근상 과대 확대·레이어 사각 배경·대사 가림 없음. 모바일 390×844 5종 프레이밍·가로 넘침 없음 확인(도현/수현 육안 포함). 선택 대기 3개 버튼이 그림 아래 가려지지 않음을 별도 복원 상태에서 확인했다.
- 실제 프로덕션 preview에서 5종 새로고침 복원 전후 게임 상태 동일, 동일 초상 재계산 확인. 녹음 2블록 DOM/alt 부재와 현장 수현 복귀를 실제 확인했다. 원본/배포/dist 바이트 일치와 기존 한이경 해시 보존 확인.
- 타입·resolver 8개·원문 SHA/82장면/54선택 검증·Vite build 142모듈 통과(JS 842.37KB, 기존 500KB 경고). 초기 타입 누락 1건 수정, 문 반대편 지후를 현장으로 기대하던 옛 검사도 현재 현장 경계로 수정 후 통과했다.
- 순차 브라우저 진행 대기에서 자동화 timeout이 발생해, 실제 도달한 블록/선택 스냅샷의 직접 복원으로 해당 배치 경계를 확인했다. 전체 E2E·전 82장면 육안·사람 플레이·실배포는 이번에 수행하지 않았다.

## 7. 제목·공개 컷 5종 추가

- 이 단계까지 수신 **18종**(배경7·초상6·제목1·자료컷4), 미수신 문서3. 엔딩 추가 후 총계는 §8의22종. 이번 지정5장 미사용/누락 **0**. 봉투는 기존 `doc_seal_envelope` ID를 재사용하며 중복 별칭을 만들지 않는다.
- 원본은 모두 PNG RGB(colorType2), 불투명 1672×941(약16:9). Downloads와 원본 보관본 SHA/바이트 동일. 배포본은 같은 해상도의 quality0.94 WebP(실제 RIFF/WEBP/VP8X, 알파 플래그 없음); 리사이즈·크롭·그림/문구 생성 없음.
- 원본 2.03–2.25MB는 1MB 초과 검토 대상이므로 배포하지 않는다. 배포188,732–281,258B; 제목/수첩은 200KB 목표 미만이지만 의도적 용량 부풀리기 없음. 봉인 테이프·종이 접힘·수첩 여백·CCTV 인물/책상 소품 보존.

| 자산 ID / 스키마 ID | 원본 파일 / B | 배포 파일 / B | SHA-256 원본 → 배포 |
|---|---|---|---|
| `title_main` / `ASSET_TITLE_MAIN` | `title_main.png` / 2026299 | `title_main.8acbf9a91c2b.webp` / 193734 | `7ba148afdf515fb5e7f99e39167807692701222cf072b9a48d15111a63468467` → `8acbf9a91c2bd64c69fe0f630704cf20dda5fb7de0e9b6d85d3aff628b7cb85d` |
| `doc_seal_envelope` / `ASSET_DOC_SEAL_ENVELOPE` | `cg_sealed_envelope.png` / 2249304 | `cg_sealed_envelope.096d00275bca.webp` / 281258 | `7b40a2a861bbba08e9cd204fc3a97722c57765f722cbcb3989e861be780f4c48` → `096d00275bcad16b5794ee0345a0076d97f89aef9b6c9b0659077d96f9782b6b` |
| `cg_cctv_safety` / `ASSET_CG_CCTV_SAFETY` | `cg_cctv_safety.png` / 2094412 | `cg_cctv_safety.75ac0260c6b4.webp` / 207374 | `b451d79b1821047944d3e722697cd40f3cbad0c7e2cfd0e6cd371933e1ea6584` → `75ac0260c6b41995f1397869b2fb2ec9f8a91d22ed2f098c1671f00634ec0113` |
| `cg_notebook` / `ASSET_CG_NOTEBOOK` | `cg_notebook.png` / 2048488 | `cg_notebook.6950bd84509c.webp` / 188732 | `a1350425c8cabdd7082ca168a1b83e19cc6509b94dfc2c15aba3b139508c052f` → `6950bd84509c6f35538e696918c0a0613acae8a0da07cd97f60b1de957d6a041` |
| `cg_letter` / `ASSET_CG_LETTER` | `cg_letter.png` / 2108169 | `cg_letter.3e772475caf9.webp` / 229572 | `a007395233e4707ae1d8b47ec7443c9ba598671a672af216863c933b04925d89` → `3e772475caf97a12d8e9e1fa563477120c6e08508bee0d82432bb315b84b97fa` |

### 공개·사용 조건 (기존 §3 후보보다 우선)

| 컷 | 공개 완료 기준 | 추가 조건 / 표시 범위 |
|---|---|---|
| 제목 | 최초 CH01 시작 전 타이틀만 | 기존 HTML 제목·시작/이어하기 버튼 유지; 다른 장 입장 화면에는 재사용 안 함 |
| 봉투 | `BLK_CH01_S01_08` 완료 후 | 첫 언급 뒤 CH01_S01와 실제 선택한 C01 결과에서만. E02 보유 여부로 열지 않음 |
| CCTV | `BLK_CH03_S01_01` 완료 후 | 영상 첫 공개 뒤 CH03_S01와 실제 선택한 C05 결과에서만. 단일 설명 삽화, 원본 CCTV/새 증명/현장 지후 아님 |
| 편지 | `BLK_CH09_S01_A_02` 완료 + `ESECTION_E14_02` 공개 | C21_A 확정·그 결과 장면에서만. 봉투 입수/사적 열람 허용/장면 입장/E14 보유만으로 표시하지 않음 |
| 수첩 | `BLK_CH09_S02_A_05` 완료 + `ESECTION_E16_05` 공개 | C22_A 확정·그 결과 장면에서만. 04의 수첩 꺼내기보다 엄격하게 실제 문서 문장 완료 뒤. E16 보유만으로 표시하지 않음 |

- `src/engine/illustrations.ts`는 블록 공개 이력·확정 선택·공개 문단만 읽는 순수 resolver다. 저장 스키마/원문/효과는 변경하지 않는다. 정확한 문서·서명·시각은 기존 HTML 본문/공개 로그에 남기며 이미지에 합성하지 않는다.
- 모든 컷은 `contain / center center`; 현재 배경/초상을 대신하는 별도 삽화 레이어이며 대사·선택은 아래 HTML 흐름. 편지의 면담실 책상은 문서 참고컷이지 CH09_S01 복도에서 이동한 사건이 아니다. CCTV도 현장 인물 초상을 추가하지 않는다.
- 선읽기는 **실제로 선택된 경로의 현재 공개 대상 블록 한 장**만 detached Image로 요청한다. 다른 선택 결과·다음 장·미래 소품 전체를 선읽지 않고 alt/숨은DOM도 생성하지 않는다. 화면 표시는 해당 블록 완료 후만 가능하다.
- 공개 전/실패/누락은 기존 중립 영역. run·scene·URL별 key와 독립 로드 상태로 이전 컷/늦은 성공이 현재 레이어를 덮지 않는다. 재로드 시 저장된 공개 상태로 재계산하며 그림 상태를 저장하지 않는다.

### 이번 검증

- 타입, 관련 Vitest16개(기존resolver8+공개컷8), 원문 SHA·82장면·54선택·pending0 통과. 최종 프로덕션 build143모듈, JS847.05KB(기존500KB 경고).
- 실제 프로덕션 `/lecture/last-check/`: 제목/공개4컷 전후12개 도달 상태 복원, 이미지5종 PC1280×960·모바일390×844 캡처/육안 및 overflow/contain/버튼 경계 확인. CCTV 얼굴/손·봉투·문서 가장자리 크롭 및 대사/버튼 가림 없음. 최종 편지 참고컷 안내의 모바일 줄바꿈도 확인.
- C21/C22의 AA·AB·BA·BB 경로 확인. B 선택시 미선택 문서의 이미지 요청·alt/숨은DOM·전체 기록/로그 비노출 확인; BA는 수첩만 표시하며 편지 요청 없음. A 경로라도 공개 블록 이전 화면에는 컷 없음.
- 5장 각각 강제 요청 실패: 중립 fallback, 노출 alt 없음, 기존 버튼 활성 유지, 복원 게임 상태 전체 동일. 봉투 응답을 지연한 채 실제 계속/C01_B 선택으로 다음 장면 진입 후 응답 재개: 현재 면담실/한이경 URL·alt가 그대로 유지됨.
- 파일명 대소문자·해시 버전·base·HTTP200/image-webp·원본 동일/배포-dist 동일 확인. 미검증: 전체 E2E 재실행·전82장면 육안·사람 플레이·실배포. 기존 인물 외곽 잔색은 §6에 유지. Google/보조 모델 호출·인증/한도/모델 설정 변경 없음.


## 8. 엔딩 4종 및 전체 제공 자산·82시각정책 검수 (최신)

### 파일·버전

- 원본 `art-source/originals/end_*.png`: Downloads와 SHA/바이트 동일한 불투명 RGB PNG(colorType2), 1672×941(약16:9). 배포 `public/assets/`: 같은 크기·무크롭 quality0.94 WebP, 실제 RIFF/WEBP 및 알파 플래그 없음. 새 그림/합성/문구 생성 없음.
- 원본1.94–2.14MB는 1MB 초과 검토 후 비배포 보존. 배포148,904–229,852B; TRUE는 여백 위주 그림이라 200KB 목표 미만을 허용하며 용량을 인위적으로 늘리지 않는다. 종이·봉투·영상 모니터/손·프린터를 크롭하지 않았다.

| 자산 ID / 스키마 ID | 원본 파일 / B | 배포 파일 / B | SHA-256 원본 → 배포 |
|---|---|---|---|
| `end_true` / `ASSET_END_TRUE` | `end_true.png` / 1942089 | `end_true.d544b2136f72.webp` / 148904 | `349a16c79cd711a89b8a93cd505996c630f5022f5f7412414291dae9d4c20073` → `d544b2136f72ca5b4ef7a1cb4cbe86cf9105732e26bfbaed1f0c075b18e61b79` |
| `end_good` / `ASSET_END_GOOD` | `end_good.png` / 2142265 | `end_good.7642fc336233.webp` / 229852 | `06c686e7ebeb943a2c5e1b82958bf86309ccfae2a0c217a7d8a8fa113ced7707` → `7642fc3362336d1887b8fb0b1512824f0df10192216798b6215c5bbdcfcb812c` |
| `end_bad01` / `ASSET_END_BAD01` | `end_bad01.png` / 2107728 | `end_bad01.009de59bd4c7.webp` / 215166 | `107c432a0bd435d173a5b5c3dcf07495a1e7a19bdae1d72eb09e95a289faa3f4` → `009de59bd4c721ecda8201ab6cf6e6e77ed4d5f93d26d552881c0ee61a83c2ed` |
| `end_bad02` / `ASSET_END_BAD02` | `end_bad02.png` / 2093547 | `end_bad02.33eb7099ca39.webp` / 203188 | `ae31af4557c0174d9c34371239c20a1369042fe6f9162ca69ca20aced3a898ab` → `33eb7099ca39fa9bf17031146aca868fe87e104b60343480bfb3a62422205e90` |

### 공개·alt·운영 정책

| 장면 / 컷 | 마지막 시각묘사 blockId / 원문 행 | 표시·종료 |
|---|---|---|
| END_TRUE / end_true | `BLK_END_TRUE_71` / 1674 | 두 장의 종이 묘사 블록 활성화부터 카드/마지막 문장/완료까지 |
| END_GOOD / end_good | `BLK_END_GOOD_31` / 1743 | 마지막 서술 블록 활성화부터 완료까지; 서류/닫힌 봉투 참고컷 |
| END_BAD01 / end_bad01 | `BLK_END_BAD01_24` / 1808 | 영상 속 손 묘사 블록에서만. `BLK_END_BAD01_25` 암전부터 CG·배경·초상/alt 모두 제거; 카드에서 복귀 안 함 |
| END_BAD02 / end_bad02 | `BLK_END_BAD02_37` / 1889 | 재수사 시작 묘사 블록 활성화부터 완료까지. 유죄확정 그림 아님 |

- 엔딩 컷은 일반 자료컷의 완료 후 규칙과 달리 **해당 마지막 묘사 블록의 before 정책**이다. 그 블록의 원문 HTML과 함께 공개하며 이전 블록/엔딩 입장/지목 전에는 그림·alt·선읽기 모두 없다. 원문 공개 블록을 새로 만들거나 순서를 바꾸지 않았다.
- 현재 엔딩 scene + 확정 `FLAG_OUTCOME` + 실제 C24 선택/결과 이력을 함께 확인한다. 판정을 재계산하지 않는다. 엔딩4장 일괄 preload 없음; 해당 마지막 묘사에서 현재 한 장만 요청. 기존 봉투/CCTV/편지/수첩 after 경계는 그대로다.
- alt는 공개된 종이/봉투/영상 모니터/서류만 설명한다. BAD01 모니터 인물을 현장 초상으로 분리 배치하지 않는다. 제목·서명·문서/시각·엔딩명·마지막 문장은 기존 HTML. 공개로 E/D·trust·원본·선택·저장·엔딩/C15 규칙을 변경하지 않는다.

### 제공·적용·미사용·미수신 총계

| 구분 | 제공 | 적용 | 미사용 | 미수신 |
|---|---:|---:|---:|---:|
| 배경 | 7 | 7 | 0 | 0 |
| 초상 | 6 | 6 | 0 | 0 |
| 제목 | 1 | 1 | 0 | 0 |
| 자료컷 | 4 | 4 | 0 | 3 |
| 엔딩컷 | 4 | 4 | 0 | 0 |
| 합계 | 22 | 22 | 0 | 3 |

- 적용은 단순 후보표가 아니라 런타임 정책 참조 및 실제 4개 엔딩 경로에서 한 번 이상 활성화됨을 확인했다. 파일/스키마 등록/경로/해시/실제 형식·크기 및 public→dist 바이트가 모두 대응한다. public/assets 실제 파일도 22개, 미등록/미사용 배포 파일 없음.
- 미수신: `doc_roster_tags`, `doc_safety_confirmation`, `doc_independent_log`. 이를 다른 컷으로 수신 처리하지 않으며 정확한 문서는 원문 HTML로 유지한다. 미술 전체 완료를 뜻하지 않는다.

### 82시각정책·검사 근거

- 82장면 모두 명시 매핑, 그중 결과54장면은 부모 상속. 기본 레이어 block override before30/after2, 확정 variant 제한3개 및 장면 공개 조건을 검사했다. 제목/자료4/엔딩4는 별도 공개 cue가 우선한다. 부모의 무관한 block 전환은 결과 장면에 재생하지 않는다.
- 실제 장소/참고컷, 현장 인물/문 너머·녹음 인물, 공개 문단/미선택 A/B, 저장 재계산·중립 실패 정책은 §5–7과 기존 resolver 검사 그대로 유지. §3 표는 최초 후보 이력이지 조건 없이 전부 보여준다는 뜻이 아니다.
- 타입·관련 Vitest35개(시각/공개16+엔딩컷5+기존선택계약14)·원문 SHA/82장면/54선택/pending0 통과. build143모듈·JS850.75KB, 기존500KB 경고.
- 실제 원문 경로 4개를 처음부터 종료까지 실행: TRUE 기본 witness, GOOD C11_B/C21_B, BAD01 C12_B, BAD02 C09_B/C17_B/C24_B 변경. 1,506상태·58개 실제 방문 장면에서 제공22종 모두 사용, 미래 엔딩 preload 없음, 엔딩 진입→완료 E/D 불변. 82개 전체를 육안 완료했다고 주장하지 않는다.
- 프로덕션 preview `/lecture/last-check/`에서 지목 전/입장/직전/공개/후속/완료와 최초 타이틀 총25상태 복원: 이전/다른 엔딩 요청·alt·숨은DOM 없음, 저장 게임 상태 전체 동일. 실제 계속 버튼으로 공개→BAD01암전/완료→타이틀 복귀도 네 경로 모두 확인.
- 4컷 PC1280×960·모바일390×844 캡처/육안: contain/center, 종이/봉투·모니터 인물/손·서류 가장자리 보존, 대사/버튼 가림·가로 넘침 없음. 4컷 각각 요청 강제 실패시 중립 fallback·저장 상태 불변. 운영 base의 22파일 HEAD200·image MIME·Content-Length 일치, 실제 대소문자/해시 버전 확인.

### 남은 미술 문제·미검증

- **GOOD 제공 컷에는 원문 마지막 가족사진이 없다.** 서류와 닫힌 봉투 참고컷으로만 적용하고 안내/원문에 이를 명시했다. 그림을 추가 생성하거나 사진의 가족관계·화해/새 비밀을 만들지 않았다.
- 기존 초상5종의 외곽 미세 붉은 잔색(§6), 기존 PNG8종의 1MB 초과(초기 배경2·기존 한이경·추가 초상5)는 보존/검토 상태다. 제공22종 적용을 전체 미술 완성으로 보고하지 않는다.
- 전82장면 PC/모바일 육안·사람 플레이·원격 실배포 경로는 미검증. 전체 E2E의 현재 결과는 아래 §9를 따른다. 이 미술 단계에서는 운영용 빌드의 로컬 preview만 검증했다. 모델/인증/한도 설정 변경·다음 개발/배포 없음. 당시 검증 탭과 preview4179 종료, 기존5173 유지.

## 9. 현재 전체 QA 재검사

- 원본/배포본 재생성 없이 기존22종을 검사했다. `scripts/verify-art-assets.ts` 통과, `qa-logs/art-assets.json`에 제공/적용22·미사용0·미수신3 및 전체82매핑을 기록했다. 부모상속54·block before30/after2·variant/공개 cue·fit/position·참조/순환, 실제 형식/치수/알파/용량·대소문자/해시 버전·public→dist 바이트 대응을 확인했다.
- 별도 검수 페이지에서22개 실제 GET/디코드200, MIME/바이트/치수 일치·오류0(`qa-logs/asset-browser.json`). 초상6종은 실제 alpha0 배경/부분 alpha를 확인했다. 이 검수 페이지의 일괄 요청은 게임 시작 시 사전로딩이 아니다.
- 전체 단위14파일 고유286건(시각8·자료컷8·엔딩컷5 포함), 브라우저 고유24건 통과. 최초 실패와 관련 재검사의 합산이며 `FULL_QA.md`/`qa-logs/browser-evidence/index.json`에 원본 근거를 구분했다.
- Chromium 새 타이틀부터8경로 실제 선택ID192클릭으로 종료까지 완주, 장면76/82 관측. 별도 실제 엔진 탐색은82/54/4엔딩 전체 도달을 검증했다. 82장면 전체 PC/모바일 육안으로 과장하지 않는다.
- WebKit/iPhone13 설정390×844에서 실제 터치 진행·설정·수첩/로그·수동 저장/복원/재접속과 캡처5장 확인. 실기기 iOS/Safari는 미검증이다. 완주8/모바일2의 최종404/요청실패/브라우저콘솔·pageerror 진단0.
- §8의 미수신 문서3·GOOD 가족사진 부재·초상5 외곽 잔색·PNG8종1MB 초과 검토는 그대로 남긴다. 제목/버튼·정확한 문서/서명/시각은 원문 HTML, 실제 장소/참고컷·현장/녹음 인물·편지/수첩/엔딩 공개 정책을 변경하지 않았다.
- 이번 타입·콘텐츠·빌드146모듈 검증 통과, 기존500KB 번들 경고 유지. 검수 preview4183 종료, 기존5173 보존. 다음 단계/배포 미착수.


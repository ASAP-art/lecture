# 전체 QA — 현재 요청 결과

## 판정과 보존 범위

- 요청한 전체 자동 검사를 실제 실행했다. 제품 원문·콘텐츠·엔진·UI·게임 저장 계약·C15·분기·엔딩·자산은 변경하지 않았다. 루트 로또 `index.html`, `new-site/`, 원문/SHA256SUMS, lockfile도 변경하지 않았다.
- 최종 **고유 단위 286건/14파일, 브라우저 24건(Chromium22 + WebKit 모바일2) 통과**. 최초 전체 실행의 실패를 최소 수정한 뒤 해당 검사만 다시 실행한 합산이며, 한 번에 전체가 녹색이었던 실행으로 보고하지 않는다.
- 변경은 `tests/full-qa-contract.test.ts`, `scripts/verify-art-assets.ts`, `e2e/{endings,saves,webkit-mobile}.spec.ts`, `playwright.config.ts`와 검수 문서/생성 근거다. 기대값·오류 검출·엔진 가드는 완화하지 않았다.
- 로컬 프로덕션 preview `http://127.0.0.1:4183/lecture/last-check/`를 사용했다. 원격 배포·다음 개발 단계는 진행하지 않았다.

## 1. 원문·스키마·실제 엔진

| 항목 | 실제 검사와 결과 |
|---|---|
| 원문 보존 | `validate-content.ts` 통과. SHA-256 `66e7358249200fd6624e03f7f818a9c1a0f434cb3ca032c3ef1c89b148fa7336` 일치 |
| 전체 콘텐츠 | 10챕터·82장면·54선택·4엔딩, pending0. 본문/조건부 결과의 원문 범위·발췌·출처·전이·참조/스키마 검사 통과 |
| 마지막 문장 | PART6 2036행의 허용 문장만 엔딩 마지막 카드 뒤 별도 종료 블록. 네 엔딩 UI 완주에서도 순서 확인 |
| 개발자 전용 내용 | PART2/5/6 해설·판정용 FLAG/SRC/VAR/효과 식별자·proof/full의 플레이어 본문/수첩 노출 금지 검사 통과 |
| 실제 엔진 도달성 | `verify-reachability.ts`가 실제 전이 함수를 탐색. 82장면·54선택·4엔딩 도달, 판정 동치류35,911·종료 동치류20,696 |
| 전이/막힘 | 허용75,318·거부10,672, dead end0·scene loop0·state loop0, 증인58개 실제 엔진 재생 통과 |
| 종료 분포 | BAD01 18,720 / BAD02 1,872 / GOOD96 / TRUE8 종료 동치류 |
| 공통 증거 | CH07_S03의 E06 보유720상태, CH08_S01의 E09 보유1,120상태 불변 검사 통과 |

도달성은 미래 판정에 필요한 상태를 보존한 동치류 탐색이지 모든 과거 로그 문자열의 조합을 별도 실행했다는 뜻이 아니다. 현재 입력 지문은 `445bdf55c602f67be3c837a63610d380aba7994d8a4f79b0cb0acda7cfe99953`; 증인/요약은 `REACHABILITY_WITNESSES.json`에 있다.

기존 `DESIGN.md`의 장면 표시줄 계약에 따라 `CH01_S01` 같은 **장면 코드 표시는 유지**한다. 금지된 개발자 해설/판정 데이터의 비노출과 구분한다. 클라이언트 번들을 분석해 원문을 추출하지 못하게 하는 보안 기능을 검증한 것은 아니다.

## 2. D/proof/full/C24·C15·엔딩 내부 분기

| 계약 | 근거와 결과 |
|---|---|
| D1–D6 | `decision-contract.test.ts`의 독립 원문 오라클/전제 진리표 및 챕터 회귀 통과. D5의 복원·핵심 증거·선행 추리 누락, 가족 증거16조합 포함 |
| proof/full/C24 | 최종 입력65,536조합에서 A/B/C의 허용/거부·도착 엔딩·거부 시 상태 불변 대조 통과. C24_B의 D1/D3 반증, proof 보유 시 C24_C 거부 포함 |
| C15 전 범위 | A/B/C × 대상 증거 미보유/보유 × trust -2/-1/0/1/2 =30경계 조합. 기존12 + 추가18 검사 통과 |
| C15 효과 | 보유 중에도 해당 인물 trust +1, 상한2, 다른 인물 관계 불변, 증거 중복 없음. 같은 효과 재호출/새로고침/복원/챕터 분기에서 중복 지급 없음 |
| 지정 GOOD | 실제 엔진으로 C11_B+C21_B GOOD, E14 미보유 GOOD/보유 GOOD의 다른 원문 문단 확인 |
| D6 단독 BAD | 실제 엔진의 추리 집합이 정확히 `[D6]`인 경로로 C24_A/C 모두 BAD01. proof 대체 불가 |
| BAD01 첫 누락5종 | D1/D2/D3/D4/마지막 연결 각각을 실제 선택 경로로 누락시켜 복기 문단 확인 |
| BAD01 비연속 보유 | D1–D4 전체16마스크의 첫 누락 우선순위. 기존5 + 추가11 상태주입 경계 검사 통과 |
| 엔딩 내부분기 | GOOD E14 양쪽, BAD01 C24_A 전용 문단 유무와 C24_C 차이, TRUE/GOOD/BAD02의 마지막 카드·종료 문장 순서 통과 |
| 공개와 보상 | 엔딩 전체 블록을 진행해도 진입 당시 E/D 불변. 미선택 C21_B/C22_B 경로의 편지·수첩/가족 자료 제목·슬롯을 수첩에 먼저 만들지 않음 |

### 상태주입 구분

- 추가 `full-qa-contract.test.ts` 38건 중 **9건은 시작부터 실제 엔진 선택 경로**다: GOOD2, D6 단독 A/C2, BAD01 첫 누락5.
- 나머지 **29건은 명시적 경계 상태주입**이다: C15 추가18, BAD01 비연속 마스크11. 자연 경로로 해당 모든 상태가 도달한다고 주장하지 않는다.
- 기존 브라우저 `saves`의 완료 실행/보호본 fixture, `reading`의 준비 상태와 저장소 장애 주입은 엔진 생성 fixture/오류주입 검사다. 아래 원문 완주 경로와 섞지 않는다.

## 3. Chromium — 원문 선택ID 실제 클릭 완주

`e2e/endings.spec.ts`는 매번 새 타이틀에서 CH01 시작 후 `[data-choice-id]`를 실제 클릭한다. 중간 장면/증거/엔딩 상태를 주입하지 않는다. 각 경로24번, 총192번 선택; 결과 블록과 다음 진행을 거쳐 종료 문장과 TITLE까지 확인했다.

| 실제 완주 경로 | 결과 | 특수 검증 |
|---|---|---|
| TRUE | END_TRUE | D1–D6, 마지막 카드→종료 문장→깨끗한 TITLE |
| GOOD without E14 | END_GOOD | 편지 미보유 원문 문단 |
| GOOD with E14 | END_GOOD | 편지 보유 원문 문단 |
| GOOD C11_B + C21_B | END_GOOD | 공식 조사 경로도 GOOD, 미선택 사적 자료 은닉 |
| BAD01 accusation | END_BAD01 | C24_A 전용 원문 문단 |
| BAD01 insufficient proof | END_BAD01 | C24_C, A 전용 문단 없음 |
| BAD01 D6 only | END_BAD01 | D6만으로 범행 증명 불가 |
| BAD02 | END_BAD02 | 실제 허용된 C24_B, 원문 결말/종료 순서 |

대표 네 엔딩 외 지정 특수 경로까지 총8개 완주했다. 관측 장면76/82, 고유 선택48/54이며 나머지를 브라우저에서 육안 완주했다고 주장하지 않는다. 전체82/54 도달성은 §1의 엔진 탐색으로 별도 검증했다.

`qa-logs/browser-evidence/index.json`에 각 실행 출처, 원본 선택ID24개, 관측 scene/block, 종료 E/D, 빈 TITLE E/D와 상태주입 없음 표시가 연결되어 있다. 8경로 및 WebKit2건의 최종 수집 진단에는 HTTP400+·요청 실패·브라우저 console warning/error·pageerror가 모두0이다.

## 4. 저장·공개·실행 격리

- `storage.test.ts` 46건과 실제 Chromium 저장 E2E7건 통과: 자동1/수동3, 재접속 동일 실행, 수동/보호본 불러오기와 완료 챕터 분기의 새 runId/parentRunId, 원본/보호본 보존, 미래 증거/효과 합치기 금지.
- C15 A/B/C 및 네 엔딩, GOOD E14 양쪽의 저장/복원, 원본 챕터 입장 전 prefix 복제와 효과1회성 확인.
- 실제 두 탭 revision 충돌→명시적 다시 읽기로 교체, 용량 초과/저장소 차단 시 메모리 진행·기존 durable bytes 보존·재시도, 손상 원본 내보내기/백업 복구 통과.
- 설정/엔딩 프로필은 수사 저장과 분리. 타이핑 글자마다 저장하지 않음, 읽기 설정/수첩/로그 열람이 E/D·관계·공개·진행/게임 저장 바이트를 변경하지 않음.
- 키보드 포커스 containment/복귀, 수첩 탭, 메뉴/모달 중 본문 입력 차단, 첫 입력 전체표시/다음 입력 진행 관련 E2E도 전체 실행에 포함해 통과했다.

## 5. 22자산·82시각정책·운영 base

- `scripts/verify-art-assets.ts` 실제 실행 통과. `qa-logs/art-assets.json`에 전체25 ID의 제공/미수신·원본/배포본·형식·크기·SHA·매핑/공개 cue가 있다.
- **제공22·적용22·미사용0·미수신3**. 미수신은 `doc_independent_log`, `doc_roster_tags`, `doc_safety_confirmation`; 원문 HTML을 유지하며 다른 그림으로 수신 처리하지 않았다.
- 82장면 명시 매핑/결과54 부모 상속, block override before30/after2, 부모/variant/block 참조·순환·조건·공개 경계·fit/position을 스키마/관련 resolver·illustration·ending-art 검사로 확인했다.
- 실제 파일명 대소문자/자산 해시 버전, PNG/WebP 실제 헤더·비율·치수·알파채널·용량, 원본 PNG 보존 및 public→dist 바이트 일치를 확인했다. 압축 목표만 맞추기 위한 새 변환/소품 훼손은 하지 않았다.
- 별도 검수 페이지에서 22개를 실제 GET/디코드: **HTTP200, image MIME/전송 바이트/치수 일치, 오류0**. `qa-logs/asset-browser.json` 근거. 이는 게임 시작 시 22개를 사전로딩했다는 뜻이 아니다.
- 초상6개 모두 실제 alpha0 배경 픽셀과 부분 alpha를 확인했다. 체크무늬를 투명으로 간주하지 않았다.
- 선택/공개 이력 기반 resolver·편지/수첩 A/B·엔딩 before 경계·저장 재계산·중립 실패·늦은 이전 이미지 방지 관련 기존 단위 검사를 전체 실행에 포함했다. 이전 미술 단계의 실제 이미지 실패/복원25상태 검증은 `ART_ASSETS.md` §8 근거로 구분하며 이번에 같은25상태를 다시 실행한 것으로 세지 않는다.

### 남아 있는 미술/운영 문제

- GOOD 컷에 원문 가족사진이 없어서 서류/닫힌 봉투 **참고컷**으로만 사용한다.
- 추가 초상5장의 외곽 미세 붉은 잔색 유지. PNG8종이1MB를 초과하며 품질 보존/검토 상태다.
- 미수신 문서3종, 전82장면의 PC/모바일 육안 프레이밍 검수, 실배포 URL/CDN/캐시는 완료가 아니다.

## 6. WebKit 모바일과 실기기 구분

- 누락된 **WebKit 런타임만** 설치했다(27.2/build2388). 프로젝트 의존성/lockfile 재설치·변경은 하지 않았다.
- Playwright WebKit + iPhone13 descriptor, **390×844·터치·DPR3 에뮬레이션**으로2건 통과. 실제 iPhone/iOS Safari 검사가 아니다.
- 새 타이틀에서 실제 tap으로 C01_A 결과→수첩 증거/로그→앱이 만든 수동 저장→계속 진행→수동 복원→새로고침→C02_A→CH02까지 확인. 원본/자식 실행·E/D·효과/현재 블록 유지 검사 통과.
- 실제 터치 읽기 설정(아주 크게/천천히/즉시표시)·재접속 영속·게임 상태 불변·메뉴 포커스/복귀/Escape 통과. 화면 가로 넘침 없음, 대상 버튼/탭/select/체크 라벨44px 이상.
- 타이틀/설정 메뉴/증거/로그/CH02 캡처5장을 실제 확인했다: `qa-logs/browser-evidence/webkit-mobile-{23,24}/`. 최종 타이틀 캡처는 이미지 표시 완료를 기다려 중립 로딩 프레임과 구분했다. 설정 메뉴와 로그는 세로 스크롤 표면이다.
- 이전 UI 검수의 Chromium360×800/390×844/1366×768 및 native200% 확대 결과는 제품 UI 미변경이므로 기존 `DESIGN.md`/인수인계 근거를 재사용하며 이번 재실행으로 세지 않는다.
- **실기기 미검증**: 연결된 테스트 기기 접근 수단이 제공되지 않았고 `adb`, `idevice_id`, `ios-deploy` 실행 도구도 찾지 못했다. 기기가 실제로 존재하지 않는다는 단정은 하지 않는다. 실기기에서 같은 새 시작→C01_A→수동 저장/복원/재접속→C02_A→CH02, 읽기 설정/수첩/로그 스크롤·회전·Safari 확대를 수동 재현해야 한다. 실제 NVDA/VoiceOver 낭독도 미검증이다.

## 7. 최초 실패·최소 수정·재검사

| 최초 실패 | 원인/수정 | 같은 기대값의 재검사 |
|---|---|---|
| 새 단위 검사11건 | 직접 만든 BAD01 경계 fixture에 엔진이 요구하는 `FLAG_OUTCOME=BAD01` 누락. 실제 엔딩 진입과 같은 플래그만 fixture에 추가; 가드/기대 문단 유지 | 보강 파일38/38 통과 |
| GOOD C11_B+C21_B 브라우저1건 | 완주 자체는 성공했지만 테스트의 타이틀 재탐색/종료와 로딩이 경합해 title_main 요청 ERR_ABORTED 기록. 재탐색/시작/종료 전 실제 타이틀 이미지 표시를 확인하도록 동기화 | 해당 경로 통과, 요청 실패/콘솔 기대0 유지 |
| 기존 저장 E2E2건 timeout | 복원 후 메뉴가 열린 상태에서 inert 본문을 누르던 기존 테스트. 실제 사용자가 하는 메뉴 닫기를 추가 | 두 건 통과, C15/원본/보호본 상태 기대값 유지 |
| WebKit 첫 타이틀 캡처 | 첫 캡처가 로딩 중 중립 프레임이었다. 캡처 전에 이미지 표시 확인 추가 | 해당1건 재검사 통과, 로드된 제목 그림 육안 확인 |

- 최초 전체 단위:286 중275통과/11실패 → 보강 파일38건 재검사. 다른13파일248 + 보강38 = **고유286 통과**. `qa-logs/unit-{initial-failure,recheck,aggregate}.json`.
- 최초 완료된 전체 브라우저:24 중21통과/3실패 → 실패3건 재검사3통과 → WebKit 캡처 준비1건 추가 재검사1통과. **고유24 통과**. `browser-initial-failure.json`, `browser-recheck.json`, `webkit-title-recheck.json`, `browser-evidence/index.json`.
- 그보다 앞선 병렬 실행은 도구 deadline으로 최종 리포트가 없어 통과 근거에서 제외했다. 이후1worker/trace off로 같은 전체24건을 실제 완료했다. 최초 trace/영상은 `browser-timeout-artifacts/`, 완료된 실패 문맥은 `browser-initial-failure-artifacts/`에 보존했다. 단순 timeout을 제품 불능으로 단정하지 않았다.
- `browser.json`은 Playwright의 **가장 최근 실행1건** 원본이다. 전체 집계는 `browser-evidence/index.json`을 사용한다.
- 선택적 UI detector의 잘못된 CLI 인수 실행은 `ui-detector.json`에 있으며 제품/접근성 통과 근거로 포함하지 않는다.

## 8. 타입·콘텐츠·빌드와 재현

- `tsc --noEmit` 최종 QA 수정 후 통과(`qa-logs/type-final.json`).
- 콘텐츠 검증, 실제 도달성, Vitest 전체, Playwright 전체를 이 요청에서 실행했다. 테스트 fixture/조작만 수정한 뒤 영향 파일/실패 케이스를 재검사했고 무관한 전체 재실행으로 덮지 않았다.
- Vite 프로덕션 build 성공:146모듈, JS856.37kB(gzip186.28kB), CSS11.48kB. 기존 JS500kB 권고 경고는 남아 있다. 이후 제품 코드/자산 변경이 없어 다시 빌드하지 않았다.

`last-check/`에서 Node가 PATH에 없으면 `C:/Users/김찬중2/AppData/Local/omp-node/node-v26.13.0-win-x64/node.exe`를 사용한다.

```sh
node node_modules/tsx/dist/cli.mjs scripts/validate-content.ts
node node_modules/tsx/dist/cli.mjs scripts/verify-reachability.ts
node node_modules/vitest/vitest.mjs run --reporter=json --outputFile=docs/qa-logs/unit.json
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
node node_modules/tsx/dist/cli.mjs scripts/verify-art-assets.ts
node node_modules/@playwright/test/cli.js test --workers=1 --trace=off
```

기본 Playwright는 전용 preview4173을 직접 띄운다. 이미 띄운 독립 preview를 이용할 때만 `LAST_CHECK_QA_BASE_URL=http://127.0.0.1:4183`을 지정한다. WebKit이 없는 다른 환경에서는 해당 브라우저 설치가 선행 조건이다.

설정 확인 결과 `modelRoles.default=openai-codex/gpt-6.1-sol:high`, `task.agentModelOverrides={}`, `retry.fallbackChains={}`, advisor 비활성이었다. 현재 작업의 기본/보조모델을 Google로 돌리는 override/fallback은 없었고 모델·인증·한도 설정을 변경하거나 Gemini 재시도/그림 생성을 하지 않았다.

## 9. 미검증/다음

실기기 iOS/Android·실제 스크린리더 낭독·전82장면의 PC/모바일 육안·사람 플레이 이해도/소요시간·원격 배포 검증은 미실행이다. 자동 검사 성공을 미수신 미술/사람 플레이/배포 완료로 합치지 않는다. 다음 단계·새 기능·배포는 시작하지 않으며 별도 요청을 기다린다.

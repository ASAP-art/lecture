# 검토 배포 운영

정식 출시가 아니다. 현재 미술/사람 플레이 미완료 사항은 ART_ASSETS.md와 FULL_QA.md를 유지한다.

## 확인된 환경과 승인

- 저장소: https://github.com/ASAP-art/lecture — **공개**. 기존 main 커밋은 e06a659e5d7bc266fd39799318bbf2ff6d178d7c.
- 기존 Pages: https://asap-art.github.io/lecture/ — main /, legacy, 공개, HTTPS 강제. 루트 로또와 new-site/ 하루선 실제 응답 확인.
- 사용자는 기존 공개 Pages 재사용, 게임 소스의 공개 commit/push, Pages Actions 전환, 앱 밖 `.github/workflows/review-pages.yml` 한 파일 생성 예외를 선택했다. 저장소 비공개를 URL 비공개로 간주하지 않는다.
- 앱 소스 루트 last-check/, 빌드 출력 last-check/dist/, base `/lecture/last-check/`. 후보 검토 URL: https://asap-art.github.io/lecture/last-check/ . 최초 실제 배포 결과/커밋/HTTP 검수는 로컬 `docs/qa-logs/deployment*.json`과 저장소 작업 인수인계에 기록한다. 로컬 preview 성공은 운영 배포 성공이 아니다.

## 재현과 배포 설정

- Node26.13.0, package-lock.json 유지, npm ci → npm run build(타입+콘텐츠 포함) → 자산 검증 → npm run review:package.
- `.github/workflows/review-pages.yml`: main의 배포 입력 변경/수동 실행만 허용, 최소 contents/pages/OIDC 권한, 검증한 action commit SHA 고정. GitHub Pages 설정은 build_type=workflow로 전환한다. 별도 Vercel 프로젝트/계정/라우터/rewrite/서비스워커를 만들지 않는다.
- `scripts/package-review.ts`는 `.review-site/`만 생성한다. 기존 사이트 런타임4파일은 같은 Git 커밋에서 바이트 그대로 가져오고, 게임은 dist만 last-check/에 복사한다. 원본 HTML/소스/문서/테스트/원본 미술/QA 로그를 웹 배포 산출물에 포함하지 않는다. 게임 실행에 필요한 원문은 클라이언트 번들에 포함되므로 소스 분석 방지 보안은 아니다.
- `/last-check/deployment.json`은 review/public 표시, 실제 소스 commit, base, 런타임 파일별 SHA-256/크기를 제공한다. 배포가 성공해도 정식 출시/전체 미술 완료라고 표시하지 않는다.
- Pages는 공개 URL이다. 기존 noindex는 검색 요청일 뿐 인증/접근 제한이 아니다. 접근 제한이 필요해지면 별도 호스트의 실제 인증 보호가 선행되어야 한다.
- GitHub Pages의 HTML/CDN 캐시는 호스트 정책을 따른다. 기존 해시 파일명 JS/CSS/그림을 유지하고, 신규 sprite22 파일은 원래 이름을 보존하며 `?v=<SHA 앞12자리>`를 사용한다. 실제 URL의 Cache-Control/ETag/Last-Modified/Content-Type 및 본문 SHA를 확인한다. 지원하지 않는 `_headers`/캐시 rewrite를 추가하지 않는다.
- main 외 소스 검토 브랜치에서 확인한 커밋만 fast-forward로 main에 올린다. 강제 push/전체 staging/타사이트 수정은 하지 않는다. 실패한 build는 기존 배포를 대체하지 않는다.

## 검토 URL 스모크와 경계

- 실제 HTTPS URL에서 시작→선택 결과→수첩/로그→수동 저장/복원→재접속, Chromium 대표 엔딩 실제 선택ID 완주, WebKit390×844 터치/설정/화면과 그림을 검사한다. 최근 전체 QA는 재사용하고 호스트/경로/변경에 해당하는 스모크만 실행한다.
- 별도 깨끗한 브라우저 context에서 검수한다. 기존 사이트와 origin을 공유하므로 사용자 브라우저에서 localStorage.clear()를 실행하지 않는다. 게임 저장은 last-check 네임스페이스이며 기존 사이트 데이터를 초기화하지 않는다.
- 원본 두 사이트의 실제 응답 SHA와 커밋 바이트, 배포 manifest의 commit/base, 등록된 정확한 이미지 집합과 JS/CSS의 파일/MIME/해시·404/콘솔을 확인한다. 현재 이미지40종(기존22+신규채택18)이며 신규16종 적용·2종 미사용·4종 품질 보류는 ART_ASSETS §11에 구분했다. 응답 캐시 지연 시 새 커밋이 제공될 때까지 이전 커밋을 검수 완료로 표시하지 않는다.
- 최근 원문82/선택54·실제 엔진·단위286/E2E24의 범위/경계 주입은 FULL_QA.md. 실기기 iOS/Android·실제 스크린리더·전82장면 육안·사람 플레이는 별도 미검증이다.
- 인증은 기존 Git credential helper/GitHub 권한을 사용하며 토큰/비밀번호를 요청·문서·명령행 인자로 기록하지 않는다. 인증이 끊기면 사용자가 GitHub/Git Credential Manager에서 로그인/권한 승인 후 같은 workflow를 실행한다.

## 최초 실제 검토 배포 결과

- **공개 검토 URL:** https://asap-art.github.io/lecture/last-check/ — 정식 출시 아님.
- **실제 배포 소스 커밋:** `bd9fa17ce966fb9f81bcb2f5ff0e4a57a2a9237e`. [Pages Actions 실행42949184793](https://github.com/ASAP-art/lecture/actions/runs/42949184793)의 npm ci·타입/콘텐츠/Vite build·자산 검증·패키징·게시 모두 성공했다. `deployment.json`도 같은 커밋/base를 반환했다.
- 실제 URL 런타임29파일(그림22 포함)이200/MIME/크기/SHA 일치. 기존 두 사이트 실행4파일은 이전 e06a659 커밋과 바이트 동일하다. 게임 source/docs/art-source 및 잘못된 자산 대소문자는 예상404이며 rewrite로 숨기지 않았다. 앱 무슬래시 URL은301로 정규 URL에 연결된다.
- 실제 응답은 Cache-Control `max-age=600`, ETag/Last-Modified가 있다. 기존 미버전화 PNG3개(bg_archive/bg_interview/char_yikyung_neutral)는 이번에 바꾸지 않았다. 나중에 이미지 바이트를 바꿀 때는 파일명 버전/매핑 갱신이 필요하며 noindex/캐시를 접근 제한으로 보지 않는다.
- 실제 HTTPS URL 스모크3건 통과: Chromium TRUE는 상태주입 없이 선택ID24개를 실제 클릭해 엔딩/종료 문장/TITLE까지 완주; WebKit 모바일2건은 시작/선택→결과/수첩·로그/수동 저장·복원/재접속/CH02 진행과 읽기 설정·390×844 화면을 확인했다. 브라우저 콘솔 경고/오류·pageerror·요청 실패·예상 밖 HTTP 오류0. 모바일 타이틀/인물 캡처를 실제 확인했다.
- 공개 배포 JS/CSS가 이번 로컬 빌드 및 최근 전체 QA와 같은 해시/바이트여서 기존 단위286·E2E24를 재사용했다. 전체 검사를 다시 실행한 것으로 세지 않는다. 로컬 근거: `docs/qa-logs/deployment-{ci,http,smoke,qa-reuse}.json`, `deployment-mobile-evidence/`, `deployment-ending-evidence/`.
- 사용자 추가 인증 동작은 없다. 토큰/비밀번호를 요구·기록하지 않았다. 실기기·실제 스크린리더·전82장면 육안·사람 플레이, 미수신 문서3·기존 미술 문제는 여전히 미검증/미완료다. 현재 후속 변경은 검수 결과 문서뿐이며 이 경로는 workflow 배포 트리거에서 제외된다.

## 1차 수정 배포 범위

- 계속은 내용 폭·최소88×44px, 읽은 대사는 마지막 선택 확정 뒤 구간의 완료 로그만 재열람한다. 재열람/도움말/소개는 수사 저장을 바꾸지 않는다.
- 새 시작 메뉴는 게임 시작/플레이 방법/이어하기를 제공한다. 새 게임 소개는 건너뛸 수 있으며 기존 저장 복원은 생략한다. 진행 중 시작 메뉴 복귀는 현재 저장을 보존한다. 엔딩의 원문 TITLE 명령은 기존 새 실행 규칙 그대로다.
- 기존 초상6종의 단독 중앙/현장 그룹·미세한 연출 메타데이터만 추가했다. 새 그림은 없고 향후 요청은 ART_REQUESTS.md다. 미술/시나리오/저장/정식 출시 범위를 확장하지 않는다.
- 변경 관련 단위34건·고유 브라우저9건 통과. 기존 단순 제목 문구 검사는 새 메뉴 제목과 부분 일치해 제거하고 CH01 동작만 재검사했다. 전체 단위/E2E를 다시 실행한 것으로 세지 않는다. 기존 도달성 증인은 visual 모듈 입력 지문이 바뀌어 해당 생성 검사만 갱신했다.
- 단독/2인/3인×PC1366/모바일390/360의9상태와 소개/도움말 화면을 실제 확인했다. 인물 요청 실패·늦은 이전 요청 후 선택 결과 전환도 검사했다. 화면 경계 검수는 엔진 생성 저장을 주입한 것으로 실제 완주와 구분한다.
- 같은 Pages workflow/base/보존 패키징을 재사용한다. 위 bd9fa17은 최초 배포 이력이며 현재 반영 버전은 공개 URL의 deployment.json.commit으로 구분한다. 이번 실제 반영 커밋/원격 스모크는 루트 HANDOFF.md와 로컬 qa-logs/revision1-deployment-*.json에 기록한다.

## 신규 인물22장 적용 범위

- 기존 Pages/workflow/base/원문·게임·저장 계약을 유지한다. 자산 목록에 채택18장만 추가하고,16개 현재 대사 블록 cue·기본 초상 로딩 fallback·이전 요청 무효화를 검증했다. source/public 파일명을 바꾸거나 기본 이미지를 덮어쓰지 않았다.
- 관련 단위 고유25·Chromium3건, 1366×768/360×800/390×844 및 WebKit/iPhone13 설정의 신규16동작+3인 그룹17상태씩을 확인했다. 저장 경계 주입과 실제 C01_B 클릭/수동 복원·터치 진행/재접속을 구분한다. 기존 전체 QA/대표 엔딩 완주는 재사용했으며 이번에 다시 실행하지 않았다.
- 실제 반영 소스는 공개 `deployment.json.commit`, 최신 배포/HTTP/스모크 근거는 루트 HANDOFF와 로컬 `docs/qa-logs/sprites22-deployment-*.json`을 기준으로 한다. 공개 검토이며 정식 출시/사람 플레이/실기기 완료가 아니다. 상세 미술 목록은 ART_ASSETS §11을 재사용한다.

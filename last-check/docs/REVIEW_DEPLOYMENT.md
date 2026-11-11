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
- GitHub Pages의 HTML/CDN 캐시는 호스트 정책을 따른다. 해시 버전 JS/CSS/그림 파일을 사용하고 실제 URL의 Cache-Control/ETag/Last-Modified/Content-Type 및 본문 SHA를 확인한다. 지원하지 않는 `_headers`/캐시 rewrite를 추가하지 않는다.
- main 외 소스 검토 브랜치에서 확인한 커밋만 fast-forward로 main에 올린다. 강제 push/전체 staging/타사이트 수정은 하지 않는다. 실패한 build는 기존 배포를 대체하지 않는다.

## 검토 URL 스모크와 경계

- 실제 HTTPS URL에서 시작→선택 결과→수첩/로그→수동 저장/복원→재접속, Chromium 대표 엔딩 실제 선택ID 완주, WebKit390×844 터치/설정/화면과 그림을 검사한다. 최근 전체 QA는 재사용하고 호스트/경로/변경에 해당하는 스모크만 실행한다.
- 별도 깨끗한 브라우저 context에서 검수한다. 기존 사이트와 origin을 공유하므로 사용자 브라우저에서 localStorage.clear()를 실행하지 않는다. 게임 저장은 last-check 네임스페이스이며 기존 사이트 데이터를 초기화하지 않는다.
- 원본 두 사이트의 실제 응답 SHA와 커밋 바이트, 배포 manifest의 commit/base, 모든22이미지와 JS/CSS의 파일/MIME/해시·404/콘솔을 확인한다. 응답 캐시 지연 시 새 커밋이 제공될 때까지 이전 커밋을 검수 완료로 표시하지 않는다.
- 최근 원문82/선택54·실제 엔진·단위286/E2E24의 범위/경계 주입은 FULL_QA.md. 실기기 iOS/Android·실제 스크린리더·전82장면 육안·사람 플레이는 별도 미검증이다.
- 인증은 기존 Git credential helper/GitHub 권한을 사용하며 토큰/비밀번호를 요청·문서·명령행 인자로 기록하지 않는다. 인증이 끊기면 사용자가 GitHub/Git Credential Manager에서 로그인/권한 승인 후 같은 workflow를 실행한다.

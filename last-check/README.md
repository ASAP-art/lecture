# 마지막 확인 — 추리 웹게임 애플리케이션

현재 범위는 CH01–CH10 및 4개 엔딩(82장면·54선택) 전체 원문 연결, 순수 상태 전이 엔진, 다중 저장/보호본/챕터 분기/프로필 분리와 관련 QA다. 정식 출시·최종 미술·사람 플레이테스트 완료가 아니다. 공개 검토 배포 설정/접근범위는 `docs/REVIEW_DEPLOYMENT.md`, 전체 QA 근거는 `docs/FULL_QA.md`를 따른다.

## 호환 환경

- Node.js: `>=22.12.0 <27`
- npm: `>=10 <12`
- 확인 환경: portable Node.js 26.13.0, npm 11.20.0
- lockfile: `package-lock.json`을 커밋하고 임의 교체하지 않는다.

Vite는 Node 20.19+ 또는 22.12+를 요구하고, 현재 Playwright는 Node 22·24·26을 지원한다. 프로젝트 범위는 두 조건이 겹치는 Node 22.12 이상 27 미만으로 고정한다.

## 명령

```text
npm run dev
npm run typecheck
npm run content:validate
npm run test:unit
npm run test:browser
npm run build
```

## 경계

- `source/`, `docs/`, `art-source/`: 배포 밖
- `src/content/`: JSON·런타임 스키마·출처 추적
- `src/engine/`: reducer·순수 전이·저장·재현 정렬
- `src/ui/`: 개발 상태 화면과 이후 UI
- `tests/`: 단위·계약 검사
- `e2e/`: 브라우저 검사
- `scripts/`: 콘텐츠 무결성 검사
- `public/assets/`: 배포가 허용된 최종 자산만 허용

## 공개 검토 배포

- 기존 GitHub Pages의 로또/하루선을 보존하며 `/lecture/last-check/`에 빌드 산출물만 추가한다.
- `npm run build` 후 `npm run review:package`로 커밋에 연결된 `.review-site/`를 생성한다. 실제 배포는 GitHub Pages Actions가 수행하며 로컬 preview와 구분한다.
- GitHub 저장소와 검토 URL 모두 공개다. `noindex`는 접근 제한이 아니다. 원본 미술/문서/QA 로그는 웹 산출물에서 제외하지만 공개 저장소의 소스 비밀보호를 뜻하지 않는다.

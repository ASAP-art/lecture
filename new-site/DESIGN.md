---
name: 하루선
description: 일정과 기록이 만나는 브라우저 로컬 데일리 플래너
colors:
  ink: "#16231f"
  ink-soft: "#44534d"
  cool-paper: "#e8efeb"
  surface: "#fbfdfb"
  surface-soft: "#e1e9e4"
  forest: "#173f35"
  forest-strong: "#0e3028"
  forest-soft: "#d5e7d8"
  coral: "#a73a28"
  gold: "#9c6a16"
  line: "#cbd7d0"
typography:
  headline:
    fontFamily: "Pretendard Variable, Pretendard, Noto Sans KR, Apple SD Gothic Neo, Segoe UI, sans-serif"
    fontSize: "clamp(27px, 3vw, 38px)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Pretendard Variable, Pretendard, Noto Sans KR, Apple SD Gothic Neo, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "7px"
  md: "12px"
  lg: "18px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    height: "42px"
    padding: "0 15px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 12px"
---

# Design System: 하루선

## Overview

**Creative North Star: "데이라인 타임테이블"**

하루선은 도시 시간표의 명료한 리듬을 빌리되 교통 앱처럼 꾸미지 않는다. 할 일은 시간선 위의 정차 지점으로, 다이어리는 하루가 끝나는 종착 기록으로 읽힌다. 표준 입력과 버튼이 항상 은유보다 우선한다.

**Key Characteristics:**
- 짙은 숲색 셸과 밝고 차분한 작업면
- 날짜·시간·완료 상태를 빠르게 훑는 높은 정보 밀도
- 시간선과 정차점 하나만을 반복하는 절제된 시그니처
- 과한 장식 없이 선, 간격, 상태색으로 만든 구조

## Colors

숲색은 탐색과 핵심 행동을 묶고, 코럴과 골드는 중요도와 현재 위치처럼 의미가 있는 상태에만 사용한다. 차가운 종이색은 장시간 읽고 쓰는 화면의 피로를 줄인다.

**The State Color Rule.** 코럴과 골드는 장식이 아니라 중요도·현재 위치·경고에만 사용한다.

## Typography

본문과 인터페이스는 한국어 가독성을 우선하는 Pretendard 계열 산세리프를 사용한다. 제목은 무겁고 촘촘하게, 레이블은 작지만 충분한 대비와 굵기로 표시한다.

## Layout

데스크톱은 날짜 레일, 시간선 작업 영역, 다이어리의 3열 셸이다. 1180px 아래에서 다이어리가 다음 행으로 이동하고, 780px 아래에서는 모든 영역이 한 열로 쌓이며 날짜 레일은 수평 스크롤 목록이 된다. 주요 모바일 터치 대상은 최소 44px이다.

## Elevation & Depth

깊이는 얇은 경계와 낮은 주변 그림자로만 표현한다. 그림자는 작업면을 배경에서 분리하는 구조적 역할이며 상태 강조에 사용하지 않는다.

## Shapes

입력과 버튼은 7px, 주요 패널은 12–18px의 완만한 모서리를 사용한다. 시간선 정차점만 원형이며, 나머지 구성요소는 읽기 쉬운 사각형을 유지한다.

## Components

### Buttons
- 핵심 행동은 숲색 바탕과 밝은 글자, 헤더의 추가 행동은 골드 바탕을 사용한다.
- 보조 행동은 밝은 표면과 1px 경계를 사용한다.
- 모든 포커스는 코럴 3px 외곽선으로 표시한다.

### Inputs / Fields
- 최소 높이 44px, 밝은 표면, 1px 중립 경계로 구성한다.
- placeholder도 WCAG AA 대비를 유지한다.

### Timeline Task Row
- 시간, 정차점, 내용, 행동 순서로 배치한다.
- 중요도는 정차점 색으로만 보조하고 제목·메모를 가리지 않는다.

### Date Rail
- 선택 날짜는 숲색 면으로 표시하고 오늘은 짧은 코럴 표식으로 구분한다.
- 남은 할 일 수는 작은 골드 또는 녹색 배지로 표시한다.

## Do's and Don'ts

### Do:
- **Do** 날짜, 시간, 완료 상태를 첫 시선에서 읽을 수 있게 유지한다.
- **Do** 빈 상태와 저장 실패처럼 실제 상태에 복구 행동을 제공한다.
- **Do** 시간선 은유보다 표준 폼과 명확한 동사를 우선한다.

### Don't:
- **Don't** 시간표 소재를 표지판, 노선도, 교통 아이콘으로 과장하지 않는다.
- **Don't** 같은 크기의 장식 카드로 작업 영역을 분절하지 않는다.
- **Don't** 코럴과 골드를 의미 없는 강조색으로 확장하지 않는다.

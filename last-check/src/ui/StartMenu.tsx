import { useEffect, useRef, useState } from 'react';
import { GAME_CONTENT } from '../content/game-content';
import type { CharacterId } from '../content/ids';

const introductions: readonly { id: CharacterId; role: string }[] = [
  { id: 'CHAR_SEOJIN', role: '당신이 맡을 관할 강력팀 당직 형사' },
  { id: 'CHAR_DOHYEON', role: '기록과 증거 확보를 맡은 동료 형사' },
  { id: 'CHAR_IKYEONG', role: '기록감정 자문 · 서가 관리책임자' },
  { id: 'CHAR_JIHU', role: '계약직 아키비스트' },
  { id: 'CHAR_SUHYEON', role: '경비 · 서류 수신 담당' },
  { id: 'CHAR_JUNSEOK', role: '설비 담당 기사' },
  { id: 'CHAR_EUNSEO', role: '민간 기록지원단체 조사원' },
];

type MenuPage = 'menu' | 'introduction' | 'help';
interface Props {
  initialPage: 'menu' | 'introduction';
  canContinue: boolean;
  disabled: boolean;
  onStart(): void;
  onContinue(): void;
}

export function StartMenu({ initialPage, canContinue, disabled, onStart, onContinue }: Props) {
  const [page, setPage] = useState<MenuPage>(initialPage);
  const heading = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => { heading.current?.focus(); }, [page]);
  return <section className="start-menu" aria-labelledby="start-menu-heading">
    <h2 id="start-menu-heading" ref={heading} tabIndex={-1}>
      {page === 'menu' ? '마지막 확인을 시작하세요' : page === 'help' ? '플레이 방법' : '조사를 시작하기 전에'}
    </h2>
    {page === 'menu' && <>
      <p>진술과 기록을 대조하며 사건의 마지막 확인을 맡는 선택형 추리 게임입니다.</p>
      <div className="start-menu-actions">
        <button className="primary-action" type="button" disabled={disabled} onClick={() => setPage('introduction')}>게임 시작</button>
        <button className="continue-action secondary-action" type="button" disabled={disabled} onClick={() => setPage('help')}>플레이 방법</button>
        <button className="continue-action secondary-action" type="button" disabled={disabled || !canContinue} onClick={onContinue}>이어하기</button>
      </div>
      {!canContinue && <p className="reading-help">이어갈 진행 저장이 없습니다. 저장 파일의 상태는 상단 저장/불러오기에서 확인할 수 있습니다.</p>}
    </>}
    {page === 'introduction' && <>
      <button className="continue-action secondary-action" type="button" disabled={disabled} onClick={onStart}>소개 건너뛰기</button>
      <p>이음기록원 지하 수장고의 이동식 서가에서 사망 신고가 들어왔습니다. 사고인지, 다른 원인이 있는지 아직 확인되지 않았습니다.</p>
      <p>당신은 형사 윤서진입니다. 동료 박도현과 함께 현장의 흔적, 남겨진 기록, 관계자들의 진술을 대조합니다. 누구에게 무엇을 확인할지는 당신의 선택에 달려 있습니다.</p>
      <h3>이야기에서 만날 사람들</h3>
      <dl className="introduction-people">
        {introductions.map(person => <div key={person.id}>
          <dt>{GAME_CONTENT.characters.find(character => character.id === person.id)!.name}</dt>
          <dd>{person.role}</dd>
        </div>)}
      </dl>
      <div className="start-menu-actions">
        <button className="primary-action" type="button" disabled={disabled} onClick={onStart}>조사 시작</button>
        <button className="continue-action secondary-action" type="button" disabled={disabled} onClick={() => setPage('menu')}>시작 메뉴로</button>
      </div>
    </>}
    {page === 'help' && <>
      <ol className="play-instructions">
        <li>대사를 읽고 계속을 누릅니다. 타이핑 중에는 첫 입력으로 문장을 모두 표시하고, 다음 입력으로 진행합니다. 본문에서 Enter 또는 Space도 사용할 수 있습니다.</li>
        <li>읽었던 문장은 이전 대사로 다시 볼 수 있습니다. 현재 선택 구간 안에서만 이동하며, 선택을 확정하면 이전 구간으로 돌아갈 수 없습니다. 재열람은 진행이나 획득 내용을 바꾸지 않습니다.</li>
        <li>선택지가 나타나면 확인할 행동을 고릅니다. 사용할 수 없는 선택지는 이유와 함께 비활성화됩니다.</li>
        <li>수첩에서 공개된 증거·진술과 로그를 확인합니다. 읽기 설정에서 대사 크기·타이핑 속도·즉시표시·모션 줄이기를 바꿀 수 있습니다.</li>
        <li>진행은 이 브라우저에 자동 저장됩니다. 저장/불러오기에서 수동 저장도 할 수 있습니다. 다른 기기나 브라우저로 자동 옮겨지지는 않습니다.</li>
      </ol>
      <button className="continue-action secondary-action" type="button" disabled={disabled} onClick={() => setPage('menu')}>시작 메뉴로</button>
    </>}
  </section>;
}

import type { ReadingPreferences } from './reading-preferences';

interface Props {
  preferences: ReadingPreferences;
  onChange(patch: Partial<ReadingPreferences>): void;
  instantText: boolean;
  onInstantTextChange(value: boolean): void;
  error: string | null;
  instantError: string | null;
}
export function ReadingSettings({ preferences, onChange, instantText, onInstantTextChange, error, instantError }: Props) {
  return <section className="reading-settings" aria-labelledby="preferences-heading">
    <h3 id="preferences-heading" tabIndex={-1}>읽기 설정</h3>
    <p>현재 문장은 언제든 모두 표시할 수 있습니다. 설정은 수사 진행과 별도로 보관됩니다.</p>
    <div className="reading-fields">
      <label>대사 크기
        <select value={preferences.textSize} onChange={event => onChange({ textSize: event.target.value as ReadingPreferences['textSize'] })}>
          <option value="standard">보통</option><option value="large">크게</option><option value="largest">아주 크게</option>
        </select>
      </label>
      <label>타이핑 속도
        <select value={preferences.typingSpeed} onChange={event => onChange({ typingSpeed: event.target.value as ReadingPreferences['typingSpeed'] })}>
          <option value="fast">빠르게</option><option value="normal">보통</option><option value="slow">천천히</option>
        </select>
      </label>
      <label className="save-setting"><input type="checkbox" checked={instantText} onChange={event => onInstantTextChange(event.target.checked)} />대사 즉시 표시</label>
      <label className="save-setting"><input type="checkbox" checked={preferences.reduceMotion} onChange={event => onChange({ reduceMotion: event.target.checked })} />모션 줄이기</label>
    </div>
    <p className="reading-help">기기의 모션 감소 설정도 자동 적용합니다. 이 버전은 음향을 사용하지 않습니다.</p>
    {error && <p className="save-error" role="alert">{error}</p>}
    {instantError && <p className="save-error" role="alert">설정 미저장 — {instantError}</p>}
  </section>;
}

import { useEffect, useRef, useState } from 'react';

export const READING_KEY = 'last-check.reading.v1';
export interface ReadingPreferences {
  textSize: 'standard' | 'large' | 'largest';
  typingSpeed: 'fast' | 'normal' | 'slow';
  reduceMotion: boolean;
}
export const TYPING_DELAYS = { fast: 9, normal: 18, slow: 45 } as const;
const defaults: ReadingPreferences = { textSize: 'standard', typingSpeed: 'normal', reduceMotion: false };
interface ReadingView { preferences: ReadingPreferences; error: string | null }
function readPreferences(): ReadingView {
  try {
    const raw = localStorage.getItem(READING_KEY);
    if (raw === null) return { preferences: defaults, error: null };
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !['standard', 'large', 'largest'].includes(data.textSize) ||
        !['fast', 'normal', 'slow'].includes(data.typingSpeed) || typeof data.reduceMotion !== 'boolean') {
      throw new Error('invalid reading preferences');
    }
    return { preferences: { textSize: data.textSize, typingSpeed: data.typingSpeed, reduceMotion: data.reduceMotion }, error: null };
  } catch {
    return { preferences: defaults, error: '읽기 설정을 불러오지 못해 기본값을 사용합니다. 게임 저장은 변경하지 않습니다.' };
  }
}

/** UI-only key: never extend or rewrite game saves or the existing profile schema. */
export function useReadingPreferences() {
  const [view, setView] = useState(readPreferences);
  const initial = useRef(view.preferences);
  useEffect(() => {
    if (view.preferences === initial.current) return;
    let error: string | null = null;
    try { localStorage.setItem(READING_KEY, JSON.stringify({ version: 1, ...view.preferences })); }
    catch { error = '읽기 설정 미저장 — 이 탭에는 적용됩니다. 게임 진행과 저장은 유지됩니다.'; }
    setView(current => current.error === error ? current : { ...current, error });
  }, [view.preferences]);
  return { ...view, update: (patch: Partial<ReadingPreferences>) => setView(current => ({ ...current, preferences: { ...current.preferences, ...patch } })) };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const changed = () => setMatches(media.matches);
    changed();
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, [query]);
  return matches;
}

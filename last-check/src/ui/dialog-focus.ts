import type { KeyboardEvent } from 'react';

export function containDialogTab(event: KeyboardEvent<HTMLElement>, container: HTMLElement | null) {
  if (event.key !== 'Tab' || !container) return;
  const controls = Array.from(container.querySelectorAll<HTMLElement>(
    'button, input, select, textarea, a[href], [tabindex]',
  )).filter(element => element.tabIndex >= 0 && !element.matches(':disabled') &&
    !element.closest('[inert]') && element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) { event.preventDefault(); container.focus(); return; }
  const active = document.activeElement;
  if (!controls.includes(active as HTMLElement) || (event.shiftKey ? active === first : active === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

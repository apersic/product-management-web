import { afterNextRender, DestroyRef, inject, type Signal } from '@angular/core';

export function useClickOutside(
  target: Signal<HTMLElement | undefined>,
  onOutside: () => void,
): void {
  const destroyRef = inject(DestroyRef);
  afterNextRender(() => {
    const root = target();
    const listener = (event: Event) => {
      const current = target();
      const node = event.target;
      if (current === undefined || !(node instanceof Node)) return;
      const dialog = current.closest('dialog');
      if (dialog !== null && node === dialog) {
        onOutside();
        return;
      }
      if (node === current || current.contains(node)) return;
      onOutside();
    };
    const host = root?.closest('dialog') ?? document;
    host.addEventListener('pointerdown', listener);
    destroyRef.onDestroy(() => host.removeEventListener('pointerdown', listener));
  });
}

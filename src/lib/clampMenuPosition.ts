export function clampMenuPosition(
  triggerRect: DOMRect,
  menuWidth: number,
  menuHeight: number,
  gap = 6,
): { top: number; left: number } {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const margin = 8;

  let left = triggerRect.left;
  let top = triggerRect.bottom + gap;

  if (left + menuWidth > viewportW - margin) {
    left = Math.max(margin, viewportW - menuWidth - margin);
  }
  if (left < margin) left = margin;

  if (top + menuHeight > viewportH - margin) {
    const above = triggerRect.top - menuHeight - gap;
    top = above >= margin ? above : Math.max(margin, viewportH - menuHeight - margin);
  }

  return { top, left };
}

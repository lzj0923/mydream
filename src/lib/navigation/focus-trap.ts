export function resolveFocusTrapDestination({
  activeIndex,
  itemCount,
  shiftKey,
}: {
  activeIndex: number;
  itemCount: number;
  shiftKey: boolean;
}): number | null {
  if (itemCount <= 0 || activeIndex < 0) return null;
  if (shiftKey && activeIndex === 0) return itemCount - 1;
  if (!shiftKey && activeIndex === itemCount - 1) return 0;
  return null;
}

export function shouldCloseDrawerForViewport({
  open,
  isMobile,
}: {
  open: boolean;
  isMobile: boolean;
}): boolean {
  return open && !isMobile;
}

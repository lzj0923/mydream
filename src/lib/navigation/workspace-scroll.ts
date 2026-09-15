type ScrollWindow = {
  requestAnimationFrame(callback: () => void): number;
  cancelAnimationFrame(id: number): void;
  scrollTo(options: { top: number; left: number; behavior: "instant" }): void;
};

export function resetWorkspaceScroll(view: ScrollWindow) {
  const frame = view.requestAnimationFrame(() => view.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  return () => view.cancelAnimationFrame(frame);
}

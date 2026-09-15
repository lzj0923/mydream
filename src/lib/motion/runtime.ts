export function shouldInitializeHomeMotion({ pathname, reviewMode, reducedMotion }: { pathname: string; reviewMode: boolean; reducedMotion: boolean }): boolean {
  return pathname === "/" && !reviewMode && !reducedMotion;
}

const v2InternalRoute = /^\/(?:explore|creator|journal(?:\/[^/]+)?|drama\/[^/]+|about|download|business|privacy|terms)(?:\/)?$/;

export function shouldInitializePageMotion({ pathname, reviewMode, reducedMotion }: { pathname: string; reviewMode: boolean; reducedMotion: boolean }): boolean {
  return v2InternalRoute.test(pathname) && !reviewMode && !reducedMotion;
}

export function shouldAttachVideoSource({ visible, reducedMotion }: { visible: boolean; reducedMotion: boolean }): boolean {
  return visible && !reducedMotion;
}

export function shouldAutoplayVideo({ visible, reducedMotion, active, autoPlay }: { visible: boolean; reducedMotion: boolean; active: boolean; autoPlay: boolean }): boolean {
  return shouldAttachVideoSource({ visible, reducedMotion }) && active && autoPlay;
}

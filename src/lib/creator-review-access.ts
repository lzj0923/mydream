/** Review endpoints use App administrator permissions, independent of CMS and creator sessions. */
export function isReviewRoute(route: string): boolean {
  if (/^project-reviews\/[a-zA-Z0-9-]+\/removal(?:\/[a-zA-Z0-9-]+)?$/.test(route)) return true;
  return /^verification-reviews(?:\/[a-zA-Z0-9-]+)?$/.test(route) || /^(contract-reviews)(?:\/[a-zA-Z0-9-]+)?$/.test(route) || /^contract-templates\/(MEMBERSHIP|PROJECT)$/.test(route) || /^(reviews|interest-reviews)(?:\/[a-zA-Z0-9-]+)?$/.test(route) || /^project-reviews(?:\/[a-zA-Z0-9-]+(?:\/(?:episodes(?:\/[a-zA-Z0-9-]+\/(?:review|publication))?|publication-check|materials|materials-review|sync|sync-start|sync-finish|complete))?)?$/.test(route);
}

export function isCreatorRoute(route: string): boolean {
  if (/^projects\/[a-zA-Z0-9-]+\/episodes\/[a-zA-Z0-9-]+\/(?:metadata|draft)$/.test(route)) return true;
  if (/^projects\/[a-zA-Z0-9-]+\/(?:removal|episodes\/[a-zA-Z0-9-]+\/removal)$/.test(route)) return true;
  return /^(team|team\/(invite|member|select|business|work-type))$/.test(route) || route === "withdrawals" || route === "bank-account" || isReviewRoute(route) || /^(notifications(?:\/read)?|verification(?:\/check)?|contracts(?:\/check)?|workspace|profile|interests|favorites|project-episodes|projects(?:\/[a-zA-Z0-9-]+(?:\/(?:settings|materials|content|sync|delivery|uploads|publication-check|episodes(?:\/[a-zA-Z0-9-]+\/submit)?))?)?|scripts(?:\/[a-zA-Z0-9-]+(?:\/(?:submit|withdraw))?)?)$/.test(route);
}

export type ReviewLoadState = "loading" | "ready" | "login" | "error";
export function reviewFailureState(status?: number): ReviewLoadState {
  return status === 401 || status === 403 ? "login" : "error";
}




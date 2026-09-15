/** Remove deletion markers persisted by older versions of the FastAdmin proxy. */
export function repairLegacyAuthCookies(jar: Record<string, string>) {
  for (const key of ["keeplogin", "fastadmin_userinfo"]) {
    if (jar[key] === "deleted" || jar[key] === "") delete jar[key];
  }
}

/** Apply each Set-Cookie independently, including server-requested deletion. */
export function applyUpstreamCookies(jar: Record<string, string>, cookies: string[], now = Date.now()) {
  for (const cookie of cookies) {
    const [pair, ...attributes] = cookie.split(";");
    const at = pair.indexOf("=");
    if (at <= 0) continue;
    const name = pair.slice(0, at).trim();
    if (!/^[\w-]+$/.test(name)) continue;
    const options = new Map(attributes.map(attribute => {
      const i = attribute.indexOf("=");
      return [attribute.slice(0, i < 0 ? undefined : i).trim().toLowerCase(), i < 0 ? "" : attribute.slice(i + 1).trim()];
    }));
    const maxAge = options.get("max-age");
    const validMaxAge = maxAge !== undefined && /^-?\d+$/.test(maxAge);
    const expires = Date.parse(options.get("expires") ?? "");
    const expired = validMaxAge ? Number(maxAge) <= 0 : Number.isFinite(expires) && expires <= now;
    if (expired) delete jar[name];
    else jar[name] = pair.slice(at + 1);
  }
  repairLegacyAuthCookies(jar);
}

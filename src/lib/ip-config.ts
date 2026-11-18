/** The trusted proxy must replace this header, and the origin must not be directly reachable. */
export function getIpHeaders(production: boolean, configured?: string): string[] {
  const header = configured?.trim().toLowerCase() ?? "";
  if (!header) return production ? [] : ["x-forwarded-for"];
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(header) || header === "x-forwarded-for" || header === "forwarded") {
    throw new Error("SALARY_CLIENT_IP_HEADER must be a single trusted proxy header, not a forwarded chain.");
  }
  return [header];
}

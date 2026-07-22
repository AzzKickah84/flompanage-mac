/** Parse "1.0.84" or "v1.0.84" into numeric parts for comparison. */
export function parseVersionParts(version: string): number[] | null {
  const cleaned = version.trim().replace(/^v/i, "");
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+].*)?$/.exec(cleaned);
  if (!match) return null;

  return [
    Number(match[1]),
    Number(match[2] ?? 0),
    Number(match[3] ?? 0),
  ];
}

export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersionParts(latest);
  const b = parseVersionParts(current);
  if (!a || !b) return false;

  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return false;
}

/** PostgreSQL timestamps have at most six fractional digits. Preserve them exactly. */
export function membershipMicros(value: string): bigint | null {
  const milliseconds = Date.parse(value),
    fraction =
      value.match(/\.([0-9]+)(?:Z|[+-][0-9]{2}:[0-9]{2})$/u)?.[1] ?? "";
  if (
    !Number.isFinite(milliseconds) ||
    fraction.length > 6 ||
    value.startsWith("0000-")
  )
    return null;
  return (
    BigInt(milliseconds) * 1000n + BigInt(fraction.padEnd(6, "0").slice(3))
  );
}

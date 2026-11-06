/** Central public label rule. Global search deliberately uses full names. */
export function publicPlayerName(
  name: string,
  nickname?: string | null,
): string {
  return nickname?.trim() || name;
}

export function publicPlayerHistoryName(
  names: readonly string[],
  nicknames: readonly (string | null)[],
): string {
  return publicPlayerName(
    names.join(" / "),
    nicknames.find((nickname) => nickname?.trim()),
  );
}

export function publicPlayerAccessibleName(
  name: string,
  nickname?: string | null,
): string {
  const label = publicPlayerName(name, nickname);
  return label === name ? name : `${label} — nome completo: ${name}`;
}

export function publicPlayerHistoryAccessibleName(
  names: readonly string[],
  nicknames: readonly (string | null)[],
): string {
  return publicPlayerAccessibleName(
    names.join(" / "),
    nicknames.find((nickname) => nickname?.trim()),
  );
}

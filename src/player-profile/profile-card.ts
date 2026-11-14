import type { Person } from "../people/contract";
import type { PlayerProfileMetadata } from "./contract";
import { seasonAge } from "./view-state";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const todayInBrasilia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function draftProfile(
  person: PlayerProfileMetadata & Pick<Partial<Person>, "athlete">,
) {
  const {
    id,
    name,
    nickname,
    publicBirthYear,
    heightCm,
    weightKg,
    position,
    originCity,
    originState,
  } = person;
  const date = person.athlete?.birthDate ?? null;
  const metadata = {
    id,
    name,
    nickname,
    heightCm,
    weightKg,
    position,
    originCity,
    originState,
    publicBirthYear: date ? Number(date.slice(0, 4)) : publicBirthYear,
  };
  return { metadata, date };
}

export function profileDraftAge(
  year: number | null,
  date: string | null,
  now = new Date(),
) {
  const today = todayInBrasilia.format(now);
  const todayYear = Number(today.slice(0, 4));
  if (!date) return seasonAge(year, todayYear);
  if (year === null || date > today) return null;
  const age = todayYear - year - Number(today.slice(5) < date.slice(5));
  return age <= 120 ? age : null;
}

export function profileCardLines(
  metadata: PlayerProfileMetadata,
  age: number | null,
) {
  const {
    publicBirthYear,
    heightCm,
    weightKg,
    position,
    originCity,
    originState,
  } = metadata;
  return [
    age === null
      ? publicBirthYear?.toString()
      : `${age} anos${publicBirthYear === null ? "" : ` (${publicBirthYear})`}`,
    [
      heightCm === null ? null : `${number.format(heightCm)}cm`,
      weightKg === null ? null : `${number.format(weightKg)}kg`,
    ]
      .filter(Boolean)
      .join(", "),
    position,
    [originCity, originState].filter(Boolean).join(" - "),
  ].filter((line): line is string => !!line);
}

export type CategoryKind = "adult" | "base" | "master";

export const baseAges = Array.from({ length: 12 }, (_, index) => 12 + index);
export const masterAges = Array.from(
  { length: 12 },
  (_, index) => 30 + index * 5,
);

export function categorySelection(label: string): {
  kind: CategoryKind | "legacy";
  age: string;
} {
  if (/^(adulto|asa|asda)$/iu.test(label)) return { kind: "adult", age: "" };
  const base = /^sub[ -]*(1[2-9]|2[0-3])$/iu.exec(label);
  if (base) return { kind: "base", age: base[1] };
  const master = /^(?:([3-8][05]) *[+]|master[ -]*([3-8][05]) *[+]?)$/iu.exec(
    label,
  );
  if (master) return { kind: "master", age: master[1] ?? master[2] };
  return { kind: "legacy", age: "" };
}

export function categoryLabel(kind: CategoryKind, age: string) {
  if (kind === "adult") return "Adulto";
  return kind === "base" ? "Sub-" + age : age + "+";
}

export function normalizeCategory(label: string) {
  const { kind, age } = categorySelection(label);
  return kind === "legacy" ? label : categoryLabel(kind, age);
}

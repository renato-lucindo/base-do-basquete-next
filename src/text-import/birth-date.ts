import { z } from "zod";
const validDate = z.iso
  .date()
  .refine((value) => Number(value.slice(0, 4)) >= 1);
export function birthYearFromDate(value: string | null): number | null {
  return value && validDate.safeParse(value).success
    ? Number(value.slice(0, 4))
    : null;
}

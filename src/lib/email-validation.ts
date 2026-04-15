import { z } from "zod";

const emailSchema = z.string().trim().min(1, "required").email("invalid");

/** True when the string is a non-empty, valid email address. */
export function isValidSignupEmail(value: string): boolean {
  const r = emailSchema.safeParse(value);
  return r.success;
}

export function parseSignupEmail(value: string): string {
  return emailSchema.parse(value);
}

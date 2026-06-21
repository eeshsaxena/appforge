import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names and resolve Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Turn an arbitrary string into a URL/identifier-safe slug. */
export function slugify(input: string): string {
  return input
    .toString()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Turn a field/entity name into a human label ("fullName" -> "Full Name"). */
export function humanize(input: string): string {
  if (!input) return "";
  const spaced = input
    .replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Best-effort singular -> plural for entity labels. */
export function pluralize(input: string): string {
  if (!input) return "";
  if (/[^aeiou]y$/i.test(input)) return input.slice(0, -1) + "ies";
  if (/(s|x|z|ch|sh)$/i.test(input)) return input + "es";
  return input + "s";
}

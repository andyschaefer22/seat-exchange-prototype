import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// Expands a seat label like "5-8" into [5,6,7,8], or "5" into [5].
export function expandSeatRange(label: string): number[] {
  if (label.includes("-")) {
    const [a, b] = label.split("-").map((s) => parseInt(s.trim(), 10));
    const out: number[] = [];
    for (let i = a; i <= b; i++) out.push(i);
    return out;
  }
  return [parseInt(label, 10)];
}

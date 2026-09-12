import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNPR(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `Rs. ${n.toLocaleString('en-NP', { maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

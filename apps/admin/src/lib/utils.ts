import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format number as Nepali Rupees */
export function formatNPR(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `Rs. ${n.toLocaleString('en-NP', { maximumFractionDigits: 2 })}`;
}

/** Format date in Nepal-friendly format */
export function formatDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString('en-NP', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleString('en-NP', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Order status → badge class */
export function getOrderStatusClass(status: string): string {
  const map: Record<string, string> = {
    PENDING:          'badge-warning',
    CONFIRMED:        'badge-info',
    PROCESSING:       'badge-info',
    PACKED:           'badge-info',
    SHIPPED:          'badge-primary',
    OUT_FOR_DELIVERY: 'badge-primary',
    DELIVERED:        'badge-success',
    CANCELLED:        'badge-danger',
    RETURNED:         'badge-gray',
    REFUNDED:         'badge-gray',
  };
  return map[status] || 'badge-gray';
}

/** Shipment status → user-friendly label */
export function getShipmentLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING:          'Awaiting Pickup',
    PICKED_UP:        'Picked Up',
    IN_TRANSIT:       'In Transit',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED:        'Delivered',
    FAILED_DELIVERY:  'Delivery Failed',
    RETURNED:         'Returned',
  };
  return map[status] || status;
}

/** Generate order number */
export function generateOrderNumber(id: string): string {
  return `GMC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${id.slice(-5).toUpperCase()}`;
}

/** Truncate text */
export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

import { Params } from '@angular/router';

export interface PreOrderTarget {
  id: string;
  locationAddress: string;
  startTime: Date | string;
  endTime: Date | string;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Query params for `/menu`, що вмикають режим пре-замовлення для конкретної броні
 * (без них меню відкривається як звичайний перегляд без кнопки «Pre-Order»).
 */
export function buildPreOrderQueryParams(target: PreOrderTarget, tableLabel?: string): Params {
  const startTime = new Date(target.startTime);
  const endTime = new Date(target.endTime);
  const parts = [
    target.locationAddress,
    tableLabel,
    startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    `${formatClock(startTime)} - ${formatClock(endTime)}`,
  ].filter((part): part is string => !!part);

  return { preOrder: 'true', reservationId: target.id, reservationLabel: parts.join(', ') };
}

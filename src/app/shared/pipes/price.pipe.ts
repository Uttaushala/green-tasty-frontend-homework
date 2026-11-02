import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a dish price the way the Figma cards show it:
 * whole numbers without cents ($17), everything else with two decimals ($18.99, $22.50).
 */
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '';
    }
    const fractionDigits = Number.isInteger(value) ? 0 : 2;
    const formatted = value.toLocaleString('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `$${formatted}`;
  }
}

import { buildPreOrderQueryParams } from './pre-order-query-params';

describe('buildPreOrderQueryParams', () => {
  const target = {
    id: 'res-1',
    locationAddress: 'Baratashvili Street 14',
    startTime: new Date(2026, 10, 1, 12, 15),
    endTime: new Date(2026, 10, 1, 13, 45),
  };

  it('вмикає режим пре-замовлення і передає id броні', () => {
    const params = buildPreOrderQueryParams(target);
    expect(params['preOrder']).toBe('true');
    expect(params['reservationId']).toBe('res-1');
  });

  it('збирає підпис: адреса, стіл, дата, час', () => {
    expect(buildPreOrderQueryParams(target, 'Table 2')['reservationLabel']).toBe(
      'Baratashvili Street 14, Table 2, Nov 1, 2026, 12:15 - 13:45',
    );
  });

  it('без назви столу пропускає її в підписі', () => {
    expect(buildPreOrderQueryParams(target)['reservationLabel']).toBe(
      'Baratashvili Street 14, Nov 1, 2026, 12:15 - 13:45',
    );
  });
});

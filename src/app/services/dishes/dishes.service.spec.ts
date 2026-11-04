import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DishesService } from './dishes.service';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';

describe('DishesService', () => {
  let service: DishesService;
  let httpMock: HttpTestingController;
  const baseUrl = 'https://api.test/develop';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: baseUrl }],
    });
    service = TestBed.inject(DishesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('requests popular dishes and maps the capitalised Fats field', () => {
    let fats = '';
    service.getPopularDishes().subscribe((dishes) => (fats = dishes[0].fats));

    const req = httpMock.expectOne(`${baseUrl}/dishes/popular`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'd1', name: 'Spring Salad', price: 17, Fats: '28 g' }]);

    expect(fats).toBe('28 g');
  });

  it('passes the filters as query params', () => {
    service.getDishes('Appetizer', 'PriceAscending').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/dishes`);
    expect(req.request.params.get('dishType')).toBe('Appetizer');
    expect(req.request.params.get('sortBy')).toBe('PriceAscending');
    req.flush([]);
  });
});

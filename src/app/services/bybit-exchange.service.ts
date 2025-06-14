import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BybitAdapter, NormalizedTicker } from '../adapters/bybit.adapter';

@Injectable({
  providedIn: 'root'
})
export class BybitExchangeService {
  private readonly baseUrl = 'https://api.bybit.com/v5';

  constructor(private http: HttpClient) {}

  /**
   * Получает нормализованные данные с Bybit
   */
  getFundingData(): Observable<{ [ticker: string]: NormalizedTicker }> {
    const tickersUrl = `${this.baseUrl}/market/tickers?category=linear`;

    return this.http.get<any>(tickersUrl).pipe(
      map((response) => {
        console.log('Bybit raw data получена, передаем в адаптер...');
        const normalizedData = BybitAdapter.normalize(response);
        console.log('Bybit нормализованные данные:', normalizedData);
        return normalizedData;
      }),
      catchError(error => {
        console.error('Ошибка Bybit API:', error);

        // Возвращаем тестовые данные в случае ошибки
        console.log('Bybit API недоступен, возвращаем тестовые данные');
        const mockData: { [ticker: string]: NormalizedTicker } = {
          'BTCUSDT': {
            ticker: 'BTCUSDT',
            price: 43250.5,
            fundingRate: 0.0001,
            nextFundingTime: Date.now() + 4 * 60 * 60 * 1000 // через 4 часа
          },
          'ETHUSDT': {
            ticker: 'ETHUSDT',
            price: 2650.75,
            fundingRate: -0.0005,
            nextFundingTime: Date.now() + 4 * 60 * 60 * 1000
          },
          'SOLUSDT': {
            ticker: 'SOLUSDT',
            price: 185.25,
            fundingRate: 0.0002,
            nextFundingTime: Date.now() + 4 * 60 * 60 * 1000
          }
        };
        console.log('Bybit тестовые данные:', mockData);
        return of(mockData);
      })
    );
  }
}

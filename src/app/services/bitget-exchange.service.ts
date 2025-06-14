import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BitGetAdapter, NormalizedTicker } from '../adapters/bitget.adapter';

@Injectable({
  providedIn: 'root'
})
export class BitGetExchangeService {
  private readonly baseUrl = 'https://api.bitget.com';

  constructor(private http: HttpClient) {}

  /**
   * Получает нормализованные данные с BitGet
   */
  getFundingData(): Observable<{ [ticker: string]: NormalizedTicker }> {
    // BitGet API endpoint для получения тикеров фьючерсов
    // productType=umcbl означает USDT-M contracts (USDT-маржинальные контракты)
    const tickersUrl = `${this.baseUrl}/api/mix/v1/market/tickers?productType=umcbl`;

    return this.http.get<any>(tickersUrl).pipe(
      map((response) => {
        console.log('BitGet raw data получена:', response);
        console.log('BitGet data sample:', response.data?.[0]); // Показываем первый элемент для отладки

        const normalizedData = BitGetAdapter.normalize(response);
        console.log('BitGet нормализованные данные:', normalizedData);
        return normalizedData;
      }),
      catchError(error => {
        console.error('Ошибка BitGet API:', error);

        // Возвращаем тестовые данные в случае ошибки
        console.log('BitGet API недоступен, возвращаем тестовые данные');
        const mockData: { [ticker: string]: NormalizedTicker } = {
          'BTCUSDT': {
            ticker: 'BTCUSDT',
            price: 43180.8,
            fundingRate: 0.00015,
            nextFundingTime: Date.now() + 3 * 60 * 60 * 1000 // через 3 часа
          },
          'ETHUSDT': {
            ticker: 'ETHUSDT',
            price: 2645.2,
            fundingRate: -0.0003,
            nextFundingTime: Date.now() + 3 * 60 * 60 * 1000
          },
          'ADAUSDT': {
            ticker: 'ADAUSDT',
            price: 0.4523,
            fundingRate: 0.0001,
            nextFundingTime: Date.now() + 3 * 60 * 60 * 1000
          }
        };
        console.log('BitGet тестовые данные:', mockData);
        return of(mockData);
      })
    );
  }
}

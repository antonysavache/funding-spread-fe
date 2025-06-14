import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { BinanceAdapter, NormalizedTicker } from '../adapters/binance.adapter';

@Injectable({
  providedIn: 'root'
})
export class BinanceExchangeService {
  private readonly baseUrl = 'https://fapi.binance.com';

  constructor(private http: HttpClient) {}

  /**
   * Получает нормализованные данные с Binance
   */
  getFundingData(): Observable<{ [ticker: string]: NormalizedTicker }> {
    const exchangeInfo$ = this.http.get<any>(`${this.baseUrl}/fapi/v1/exchangeInfo`);
    const premiumIndex$ = this.http.get<any>(`${this.baseUrl}/fapi/v1/premiumIndex`);

    return forkJoin({
      exchangeInfo: exchangeInfo$,
      premiumIndex: premiumIndex$
    }).pipe(
      map(({ exchangeInfo, premiumIndex }) => {
        console.log('Binance raw data получена, передаем в адаптер...');
        const normalizedData = BinanceAdapter.normalize(exchangeInfo, premiumIndex);
        console.log('Binance нормализованные данные:', normalizedData);
        return normalizedData;
      }),
      catchError(error => {
        console.error('Ошибка Binance API:', error);
        return throwError(() => new Error('Ошибка получения данных с Binance'));
      })
    );
  }
}

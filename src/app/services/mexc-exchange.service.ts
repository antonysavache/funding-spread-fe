import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { MexcAdapter, MexcFundingResponse } from '../adapters/mexc.adapter';
import { NormalizedTicker } from '../adapters/binance.adapter';

@Injectable({
  providedIn: 'root'
})
export class MexcExchangeService {

  private readonly baseUrl = 'https://api.mexc.com';
  private readonly fundingEndpoint = '/api/v3/premiumIndex';

  constructor(private http: HttpClient) {}

  /**
   * Получает данные о funding rates с MEXC
   */
  getFundingData(): Observable<{ [ticker: string]: NormalizedTicker }> {
    console.log('🔄 MEXC: Начинаем загрузку funding данных...');

    const url = `${this.baseUrl}${this.fundingEndpoint}`;

    return this.http.get<MexcFundingResponse[]>(url).pipe(
      timeout(10000), // 10 секунд таймаут
      map(response => {
        console.log(`✅ MEXC: Получено ${response.length} инструментов`);

        // Фильтруем только USDT перпетуалы
        const filteredData = MexcAdapter.filterUsdtPerpetuals(response);
        console.log(`🔍 MEXC: После фильтрации USDT перпетуалов: ${filteredData.length} инструментов`);

        // Нормализуем данные
        const normalized = MexcAdapter.normalize(filteredData);
        const tickers = Object.keys(normalized);
        
        console.log(`🎯 MEXC: Успешно обработано ${tickers.length} тикеров:`, tickers.slice(0, 10));
        
        // Логируем несколько примеров для отладки
        tickers.slice(0, 3).forEach(ticker => {
          const data = normalized[ticker];
          console.log(`📊 MEXC ${ticker}:`, {
            price: data.price,
            fundingRate: (data.fundingRate * 100).toFixed(4) + '%',
            nextFunding: new Date(data.nextFundingTime).toLocaleTimeString()
          });
        });

        return normalized;
      }),
      catchError(error => {
        console.error('❌ MEXC: Ошибка при получении данных:', error);
        
        // Определяем тип ошибки для более информативного сообщения
        let errorMessage = 'Неизвестная ошибка MEXC API';
        
        if (error.name === 'TimeoutError') {
          errorMessage = 'MEXC API: Превышено время ожидания';
        } else if (error.status === 0) {
          errorMessage = 'MEXC API: Проблемы с сетью или CORS';
        } else if (error.status === 429) {
          errorMessage = 'MEXC API: Превышен лимит запросов';
        } else if (error.status >= 500) {
          errorMessage = 'MEXC API: Ошибка сервера';
        } else if (error.status >= 400) {
          errorMessage = `MEXC API: Ошибка клиента (${error.status})`;
        }

        console.error(`💥 MEXC: ${errorMessage}`, error);
        
        // Возвращаем пустой объект вместо ошибки, чтобы не ломать общую загрузку
        return of({});
      })
    );
  }

  /**
   * Получает информацию о конкретном тикере
   */
  getTickerFunding(symbol: string): Observable<NormalizedTicker | null> {
    console.log(`🔄 MEXC: Загружаем данные для ${symbol}...`);

    const url = `${this.baseUrl}${this.fundingEndpoint}?symbol=${symbol}USDT`;

    return this.http.get<MexcFundingResponse[]>(url).pipe(
      timeout(5000),
      map(response => {
        if (response && response.length > 0) {
          const normalized = MexcAdapter.normalize(response);
          const ticker = Object.keys(normalized)[0];
          return normalized[ticker] || null;
        }
        return null;
      }),
      catchError(error => {
        console.error(`❌ MEXC: Ошибка получения данных для ${symbol}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Проверяет доступность API MEXC
   */
  checkApiHealth(): Observable<boolean> {
    console.log('🏥 MEXC: Проверяем здоровье API...');

    const url = `${this.baseUrl}${this.fundingEndpoint}?symbol=BTCUSDT`;

    return this.http.get(url).pipe(
      timeout(5000),
      map(() => {
        console.log('✅ MEXC: API доступен');
        return true;
      }),
      catchError(error => {
        console.error('❌ MEXC: API недоступен:', error);
        return of(false);
      })
    );
  }
}

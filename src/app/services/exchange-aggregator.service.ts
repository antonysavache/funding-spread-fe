import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BinanceExchangeService } from './binance-exchange.service';
import { BybitExchangeService } from './bybit-exchange.service';
import { BitGetExchangeService } from './bitget-exchange.service';
import { MexcExchangeService } from './mexc-exchange.service';
// import { OkxExchangeService } from './okx-exchange.service';
import { NormalizedTicker } from '../adapters/binance.adapter';

export interface AggregatedNormalizedData {
  binance: { [ticker: string]: NormalizedTicker };
  bybit: { [ticker: string]: NormalizedTicker };
  bitget: { [ticker: string]: NormalizedTicker };
  mexc: { [ticker: string]: NormalizedTicker };
  // okx: { [ticker: string]: NormalizedTicker };
}

@Injectable({
  providedIn: 'root'
})
export class ExchangeAggregatorService {

  constructor(
    private binanceService: BinanceExchangeService,
    private bybitService: BybitExchangeService,
    private bitgetService: BitGetExchangeService,
    private mexcService: MexcExchangeService,
    // private okxService: OkxExchangeService
  ) {}

  /**
   * Получает нормализованные данные со всех бирж
   */
  getAllNormalizedData(): Observable<AggregatedNormalizedData> {
    return forkJoin({
      binance: this.binanceService.getFundingData().pipe(
        catchError(error => {
          console.error('Binance error:', error);
          return of({});
        })
      ),
      bybit: this.bybitService.getFundingData().pipe(
        catchError(error => {
          console.error('Bybit error:', error);
          return of({});
        })
      ),
      bitget: this.bitgetService.getFundingData().pipe(
        catchError(error => {
          console.error('BitGet error:', error);
          return of({});
        })
      ),
      mexc: this.mexcService.getFundingData().pipe(
        catchError(error => {
          console.error('MEXC error:', error);
          return of({});
        })
      ),
      // okx: this.okxService.getFundingData().pipe(
      //   catchError(error => {
      //     console.error('OKX error:', error);
      //     return of({});
      //   })
      // )
    }).pipe(
      map(results => {
        console.log('=== РЕЗУЛЬТАТЫ АДАПТЕРОВ ===');
        console.log('Binance объект:', results.binance);
        console.log('Bybit объект:', results.bybit);
        console.log('BitGet объект:', results.bitget);
        console.log('MEXC объект:', results.mexc);
        // console.log('OKX объект:', results.okx);
        console.log('=============================');

        return results;
      })
    );
  }
}

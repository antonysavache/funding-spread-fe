import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExchangeAggregatorService, AggregatedNormalizedData } from './services/exchange-aggregator.service';
import { NormalizedTicker } from './adapters/binance.adapter';

// Интерфейс для сводной таблицы
interface TickerSummary {
  ticker: string;
  exchanges: {
    [exchangeName: string]: {
      price: number;
      fundingRate: number;
      nextFundingTime: number;
    } | null;
  };
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DatePipe, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {

  protected aggregatedData: AggregatedNormalizedData | null = null;
  protected tickerSummaries: TickerSummary[] = [];
  protected loading = false;
  protected error: string | null = null;
  protected Object = Object; // Для использования в шаблоне

  // Табы
  protected activeTab: 'main' | 'arbitrage' | 'payout-times' = 'main';

  // Фильтры
  protected minDeltaFilter: number = 0; // Минимальная дельта для арбитражных возможностей (в процентах)
  protected fundingAbsFilter: number = 0; // Абсолютное значение фандинга для фильтрации (в процентах)

  private exchangeAggregator = inject(ExchangeAggregatorService);

  ngOnInit() {
    console.log('Запускаем загрузку данных для сводной таблицы...');
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = null;

    this.exchangeAggregator.getAllNormalizedData().subscribe({
      next: (data) => {
        this.aggregatedData = data;
        this.tickerSummaries = this.createTickerSummaries(data);
        this.loading = false;

        console.log('=== ФИНАЛЬНЫЙ РЕЗУЛЬТАТ ===');
        console.log('Binance тикеров:', Object.keys(data.binance).length);
        console.log('Bybit тикеров:', Object.keys(data.bybit).length);
        console.log('BitGet тикеров:', Object.keys(data.bitget).length);
        console.log('MEXC тикеров:', Object.keys(data.mexc).length);
        console.log('Уникальных тикеров в сводке:', this.tickerSummaries.length);
        console.log('===========================');
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
        console.error('Ошибка при загрузке данных:', error);
      }
    });
  }

  /**
   * Переключение табов
   */
  switchTab(tab: 'main' | 'arbitrage' | 'payout-times') {
    this.activeTab = tab;
  }

  /**
   * Создает сводную таблицу по тикерам
   */
  private createTickerSummaries(data: AggregatedNormalizedData): TickerSummary[] {
    // Собираем все уникальные тикеры
    const allTickers = new Set<string>();

    Object.keys(data.binance).forEach(ticker => allTickers.add(ticker));
    Object.keys(data.bybit).forEach(ticker => allTickers.add(ticker));
    Object.keys(data.bitget).forEach(ticker => allTickers.add(ticker));
    Object.keys(data.mexc).forEach(ticker => allTickers.add(ticker));

    // Создаем сводку для каждого тикера
    const summaries: TickerSummary[] = [];

    allTickers.forEach(ticker => {
      const summary: TickerSummary = {
        ticker,
        exchanges: {
          binance: data.binance[ticker] ? {
            price: data.binance[ticker].price,
            fundingRate: data.binance[ticker].fundingRate,
            nextFundingTime: data.binance[ticker].nextFundingTime
          } : null,
          bybit: data.bybit[ticker] ? {
            price: data.bybit[ticker].price,
            fundingRate: data.bybit[ticker].fundingRate,
            nextFundingTime: data.bybit[ticker].nextFundingTime
          } : null,
          bitget: data.bitget[ticker] ? {
            price: data.bitget[ticker].price,
            fundingRate: data.bitget[ticker].fundingRate,
            nextFundingTime: data.bitget[ticker].nextFundingTime
          } : null,
          mexc: data.mexc[ticker] ? {
            price: data.mexc[ticker].price,
            fundingRate: data.mexc[ticker].fundingRate,
            nextFundingTime: data.mexc[ticker].nextFundingTime
          } : null
        }
      };

      summaries.push(summary);
    });

    // Сортируем по названию тикера
    return summaries.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }

  /**
   * Получает минимальный funding rate
   */
  getMinFundingRate(summary: TickerSummary): number | null {
    const rates = Object.values(summary.exchanges)
      .filter(exchange => exchange !== null)
      .map(exchange => exchange!.fundingRate);

    return rates.length > 0 ? Math.min(...rates) : null;
  }

  /**
   * Получает максимальный funding rate
   */
  getMaxFundingRate(summary: TickerSummary): number | null {
    const rates = Object.values(summary.exchanges)
      .filter(exchange => exchange !== null)
      .map(exchange => exchange!.fundingRate);

    return rates.length > 0 ? Math.max(...rates) : null;
  }

  /**
   * Получает разницу между макс и мин funding rate
   */
  getFundingRateDiff(summary: TickerSummary): number | null {
    const min = this.getMinFundingRate(summary);
    const max = this.getMaxFundingRate(summary);

    return (min !== null && max !== null) ? max - min : null;
  }

  /**
   * Получает тикеры с дельтой, отсортированные по убыванию дельты
   * С применением фильтра по минимальной дельте
   */
  get tickersWithDelta(): TickerSummary[] {
    const minDeltaThreshold = this.minDeltaFilter / 100; // Конвертируем проценты в доли

    return this.tickerSummaries
      .filter(summary => {
        const diff = this.getFundingRateDiff(summary);
        return diff !== null && diff > 0 && diff >= minDeltaThreshold;
      })
      .sort((a, b) => this.getFundingRateDiff(b)! - this.getFundingRateDiff(a)!);
  }

  /**
   * Получает тикеры с разным временем выплат
   * С применением фильтра по абсолютному значению фандинга
   */
  get tickersWithDifferentPayoutTimes(): TickerSummary[] {
    const fundingThreshold = this.fundingAbsFilter / 100; // Конвертируем проценты в доли

    return this.tickerSummaries.filter(summary => {
      const times = Object.values(summary.exchanges)
        .filter(exchange => exchange !== null)
        .map(exchange => exchange!.nextFundingTime);

      // Проверяем есть ли хотя бы 2 биржи и отличаются ли времена больше чем на 1 час
      if (times.length < 2) return false;

      const uniqueTimes = new Set(times.map(time => Math.floor(time / (60 * 60 * 1000)))); // Группируем по часам
      const hasDifferentTimes = uniqueTimes.size > 1;

      // Если нет фильтра по фандингу, возвращаем все с разным временем
      if (fundingThreshold === 0) return hasDifferentTimes;

      // Применяем фильтр по абсолютному значению фандинга
      const hasSufficientFunding = Object.values(summary.exchanges)
        .filter(exchange => exchange !== null)
        .some(exchange => Math.abs(exchange!.fundingRate) >= fundingThreshold);

      return hasDifferentTimes && hasSufficientFunding;
    });
  }

  /**
   * Получает названия бирж где есть данные для тикера
   */
  getExchangesForTicker(summary: TickerSummary): string[] {
    return Object.keys(summary.exchanges).filter(exchange => summary.exchanges[exchange] !== null);
  }
}

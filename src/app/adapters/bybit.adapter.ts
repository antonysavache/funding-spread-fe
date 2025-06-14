// Контракты Bybit API
interface BybitTicker {
  symbol: string;
  markPrice: string;
  fundingRate: string;
  volume24h: string;
}

interface BybitTickersResponse {
  result: {
    list: BybitTicker[];
  };
}

// Нормализованный объект
export interface NormalizedTicker {
  ticker: string;
  price: number;
  fundingRate: number;
  nextFundingTime: number;
}

export class BybitAdapter {
  
  /**
   * Нормализует данные Bybit в единый формат
   */
  static normalize(tickersResponse: BybitTickersResponse): { [ticker: string]: NormalizedTicker } {
    
    if (!tickersResponse.result?.list) {
      console.warn('Bybit: пустой ответ от API');
      return {};
    }

    const result: { [ticker: string]: NormalizedTicker } = {};

    tickersResponse.result.list.forEach(ticker => {
      // Фильтруем только USDT пары с валидными данными
      if (
        ticker.symbol.endsWith('USDT') &&
        this.isValidTicker(ticker.symbol) &&
        ticker.fundingRate &&
        ticker.markPrice
      ) {
        result[ticker.symbol] = {
          ticker: ticker.symbol,
          price: parseFloat(ticker.markPrice),
          fundingRate: parseFloat(ticker.fundingRate),
          nextFundingTime: this.calculateNextFundingTime()
        };
      }
    });

    console.log(`Bybit адаптер: обработано ${Object.keys(result).length} тикеров`);
    return result;
  }

  /**
   * Проверяет что тикер в правильном формате XXXUSDT
   */
  private static isValidTicker(ticker: string): boolean {
    // Должен заканчиваться на USDT и иметь минимум 1 символ до USDT
    const regex = /^[A-Z0-9]+USDT$/;
    return regex.test(ticker) && ticker.length > 4; // более 4 символов (минимум 1 + USDT)
  }

  /**
   * Вычисляет время следующего funding для Bybit (каждые 8 часов: 00:00, 08:00, 16:00 UTC)
   */
  private static calculateNextFundingTime(): number {
    const now = new Date();
    const currentHour = now.getUTCHours();
    let nextFundingHour: number;
    
    if (currentHour < 8) {
      nextFundingHour = 8;
    } else if (currentHour < 16) {
      nextFundingHour = 16;
    } else {
      nextFundingHour = 24; // 00:00 следующего дня
    }
    
    const nextFundingTime = new Date(now);
    nextFundingTime.setUTCHours(nextFundingHour % 24, 0, 0, 0);
    if (nextFundingHour === 24) {
      nextFundingTime.setUTCDate(nextFundingTime.getUTCDate() + 1);
    }

    return nextFundingTime.getTime();
  }
}

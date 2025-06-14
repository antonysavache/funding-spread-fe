// Контракты BitGet API
interface BitGetTicker {
  symbol: string;                    // "LDOUSDT_UMCBL"
  last: string;                      // Последняя цена
  indexPrice: string;                // Индексная цена
  fundingRate: string;               // Funding rate
  timestamp: string;                 // Timestamp
  baseVolume: string;
  quoteVolume: string;
  deliveryStatus: string;
}

interface BitGetTickersResponse {
  code: string;
  msg: string;
  requestTime: number;
  data: BitGetTicker[];
}

// Нормализованный объект
export interface NormalizedTicker {
  ticker: string;
  price: number;
  fundingRate: number;
  nextFundingTime: number;
}

export class BitGetAdapter {

  /**
   * Нормализует данные BitGet в единый формат
   */
  static normalize(tickersResponse: BitGetTickersResponse): { [ticker: string]: NormalizedTicker } {

    if (!tickersResponse.data || !Array.isArray(tickersResponse.data)) {
      console.warn('BitGet: пустой ответ от API');
      return {};
    }

    const result: { [ticker: string]: NormalizedTicker } = {};

    tickersResponse.data.forEach(ticker => {
      // Извлекаем чистое название символа из формата "LDOUSDT_UMCBL"
      const cleanSymbol = this.extractSymbolName(ticker.symbol);

      // Фильтруем только USDT пары с валидными данными
      if (
        cleanSymbol &&
        cleanSymbol.endsWith('USDT') &&
        this.isValidTicker(cleanSymbol) &&
        ticker.fundingRate &&
        ticker.last &&
        ticker.deliveryStatus === 'normal' // Только нормальные контракты
      ) {
        result[cleanSymbol] = {
          ticker: cleanSymbol,
          price: parseFloat(ticker.last),
          fundingRate: parseFloat(ticker.fundingRate),
          nextFundingTime: this.calculateNextFundingTime()
        };
      }
    });

    console.log(`BitGet адаптер: обработано ${Object.keys(result).length} тикеров`);
    return result;
  }

  /**
   * Извлекает чистое название символа из формата BitGet
   * "LDOUSDT_UMCBL" -> "LDOUSDT"
   */
  private static extractSymbolName(symbol: string): string {
    // Убираем суффикс _UMCBL
    return symbol.replace('_UMCBL', '');
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
   * Вычисляет время следующего funding для BitGet (каждые 8 часов: 00:00, 08:00, 16:00 UTC)
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

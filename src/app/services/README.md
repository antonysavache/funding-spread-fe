# Exchange Services - Простая композиция

Простая архитектура для сбора данных funding rate с разных бирж.

## Принцип работы

1. **Сервис биржи** - имеет один публичный метод `getFundingData()` который возвращает данные
2. **Композитный сервис** - инжектит все сервисы бирж и вызывает их методы
3. **Данные** - все сервисы возвращают единый формат `FundingRateData[]`

## Структура

```
services/
├── binance-exchange.service.ts     // Реализован
├── okx-exchange.service.ts         // Заглушка
├── exchange-aggregator.service.ts  // Композит
└── README.md
```

## Как добавить новую биржу

### Шаг 1: Создайте сервис биржи

```typescript
@Injectable({ providedIn: 'root' })
export class NewExchangeService {
  
  constructor(private http: HttpClient) {}

  getFundingData(): Observable<FundingRateData[]> {
    // Ваша логика получения данных
    // Возвращайте FundingRateData[] формат
  }
}
```

### Шаг 2: Добавьте в композит

В `exchange-aggregator.service.ts`:

```typescript
constructor(
  private binanceService: BinanceExchangeService,
  private okxService: OkxExchangeService,
  private newExchangeService: NewExchangeService  // Добавить
) {}

getAllFundingData(): Observable<AggregatedData> {
  return forkJoin({
    binance: this.binanceService.getFundingData().pipe(catchError(() => of([]))),
    okx: this.okxService.getFundingData().pipe(catchError(() => of([]))),
    newExchange: this.newExchangeService.getFundingData().pipe(catchError(() => of([])))  // Добавить
  }).pipe(
    map(results => {
      const allData = [
        ...results.binance,
        ...results.okx,
        ...results.newExchange  // Добавить
      ];
      // остальная логика...
    })
  );
}
```

### Шаг 3: Добавьте в компонент (опционально)

Если нужен отдельный метод для биржи:

```typescript
// В aggregator
getNewExchangeData(): Observable<FundingRateData[]> {
  return this.newExchangeService.getFundingData();
}

// В компоненте
// Добавить в селект и в loadData()
```

## Формат данных

```typescript
interface FundingRateData {
  symbol: string;           // "BTCUSDT"
  fundingRate: number;      // 0.0001 (десятичный)
  nextFundingTime: Date;    // Дата следующей выплаты
  markPrice: number;        // Текущая цена
  baseAsset: string;        // "BTC"
  quoteAsset: string;       // "USDT"
  exchange: string;         // "binance"
}
```

## Пример реализации

```typescript
@Injectable({ providedIn: 'root' })
export class BybitExchangeService {
  
  constructor(private http: HttpClient) {}

  getFundingData(): Observable<FundingRateData[]> {
    return this.http.get('https://api.bybit.com/v5/market/funding/history').pipe(
      map(response => {
        // Конвертируйте ответ в FundingRateData[]
        return response.data.map(item => ({
          symbol: item.symbol,
          fundingRate: parseFloat(item.fundingRate),
          nextFundingTime: new Date(item.nextFundingTime),
          markPrice: parseFloat(item.markPrice),
          baseAsset: item.symbol.split('USDT')[0],
          quoteAsset: 'USDT',
          exchange: 'bybit'
        }));
      }),
      catchError(error => {
        console.error('Bybit API error:', error);
        return throwError(() => new Error('Bybit недоступен'));
      })
    );
  }
}
```

Вот и всё! Максимально простая архитектура без лишних абстракций.

import axios from 'axios';
import type { StockData } from '../types';

// Cache to store API responses
const cache = new Map();

const aggregateCandles = (timestamps: number[], ohlcv: any, interval: string): StockData[] => {
  if (!timestamps || !ohlcv || !timestamps.length) return [];

  const candles: StockData[] = [];
  let currentCandle: StockData | null = null;

  for (let i = 0; i < timestamps.length; i++) {
    const date = new Date(timestamps[i] * 1000);
    const priceData = {
      open: ohlcv.open[i],
      high: ohlcv.high[i],
      low: ohlcv.low[i],
      close: ohlcv.close[i],
      volume: ohlcv.volume[i],
    };

    // Ensure price data exists
    if (
      priceData.open == null ||
      priceData.high == null ||
      priceData.low == null ||
      priceData.close == null ||
      priceData.volume == null
    ) {
      continue; // Skip incomplete candles
    }

    if (interval === '1wk') {
      // Determine Monday of the week
      const monday = new Date(date);
      const dayOfWeek = monday.getUTCDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      monday.setUTCDate(monday.getUTCDate() - daysToSubtract);
      const mondayString = monday.toISOString().split('T')[0];

      if (!currentCandle || currentCandle.time !== mondayString) {
        if (currentCandle) candles.push(currentCandle);
        currentCandle = {
          time: mondayString,
          open: priceData.open,
          high: priceData.high,
          low: priceData.low,
          close: priceData.close,
          volume: priceData.volume,
        };
      }
    } else if (interval === '1mo') {
      // Determine the first day of the month
      const firstDayOfMonth = new Date(date.getUTCFullYear(), date.getUTCMonth(), 1);
      const firstDayString = firstDayOfMonth.toISOString().split('T')[0];

      if (!currentCandle || currentCandle.time !== firstDayString) {
        if (currentCandle) candles.push(currentCandle);
        currentCandle = {
          time: firstDayString,
          open: priceData.open,
          high: priceData.high,
          low: priceData.low,
          close: priceData.close,
          volume: priceData.volume,
        };
      }
    } else {
      // Daily candles
      candles.push({
        time: date.toISOString().split('T')[0],
        open: priceData.open,
        high: priceData.high,
        low: priceData.low,
        close: priceData.close,
        volume: priceData.volume,
      });
      continue;
    }

    if (currentCandle) {
      // Update the current candle with high, low, close, and volume
      currentCandle.high = Math.max(currentCandle.high, priceData.high);
      currentCandle.low = Math.min(currentCandle.low, priceData.low);
      currentCandle.close = priceData.close;
      currentCandle.volume += priceData.volume;
    }
  }

  // Push the last candle for weekly and monthly intervals
  if (currentCandle && (interval === '1wk' || interval === '1mo')) {
    candles.push(currentCandle);
  }

  return candles;
};

export async function fetchYahooFinanceData(symbol: string, interval: string, range: string): Promise<StockData[]> {
  const formattedSymbol = encodeURIComponent(`${symbol}.NS`); // Encode the symbol
  const cacheKey = `${formattedSymbol}-${range}-${interval}`;

  // Check the cache
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get(
      `/api/yahoo-finance/v8/finance/chart/${formattedSymbol}`,
      {
        params: { range, interval: '1d', events: 'history', includeAdjustedClose: true },
      }
    );

    const { chart } = response.data;
    if (!chart?.result?.[0]) {
      throw new Error('No data available for this symbol');
    }

    const { timestamp, indicators } = chart.result[0];
    const ohlcv = indicators.quote[0];

    // Handle cases with missing or incomplete data
    if (!timestamp || !ohlcv || !ohlcv.open || !ohlcv.high || !ohlcv.low || !ohlcv.close || !ohlcv.volume) {
      throw new Error('Incomplete data for this stock symbol');
    }

    // Process data for daily candles
    const dailyData: StockData[] = timestamp.map((ts: number, i: number) => {
      if (
        ohlcv.open[i] == null ||
        ohlcv.high[i] == null ||
        ohlcv.low[i] == null ||
        ohlcv.close[i] == null ||
        ohlcv.volume[i] == null
      ) {
        return null; // Skip null data
      }

      return {
        time: new Date(ts * 1000).toISOString().split('T')[0],
        open: ohlcv.open[i],
        high: ohlcv.high[i],
        low: ohlcv.low[i],
        close: ohlcv.close[i],
        volume: ohlcv.volume[i],
      };
    }).filter((candle: StockData | null): candle is StockData => candle !== null);

    // Aggregate data for weekly or monthly candles
    const finalData = interval === '1d'
      ? dailyData
      : aggregateCandles(timestamp, ohlcv, interval);

    // Cache the result
    cache.set(cacheKey, finalData);
    if (cache.size > 100) cache.delete(cache.keys().next().value);

    return finalData;
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);

    if (error.response?.status === 404) {
      throw new Error('Stock symbol not found');
    }

    if (error.response?.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }

    throw new Error(`Error fetching stock data: ${error.message}`);
  }
}


import axios from 'axios';
import type { StockData } from '../types';

const BASE_URL = '/yahoo-finance/v8/finance/chart';

export async function fetchYahooFinanceData(symbol: string, interval: string, range: string): Promise<StockData[]> {
  try {
    const nsSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
    
    const response = await axios.get(`${BASE_URL}/${nsSymbol}`, {
      params: {
        interval,
        range,
        includePrePost: false,
        events: 'div,split'
      }
    });
    
    // Your existing data processing logic
    if (!response.data || !response.data.chart || !response.data.chart.result) {
      throw new Error('Invalid response structure');
    }

    const result = response.data.chart.result[0];
    return processYahooFinanceData(result);
  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error);
    throw error;
  }
}

function processYahooFinanceData(data: any): StockData[] {
  const { timestamp, indicators } = data;
  const quote = indicators.quote[0];

  return timestamp.map((time: number, index: number) => ({
    time: new Date(time * 1000).toISOString().split('T')[0],
    open: quote.open[index],
    high: quote.high[index],
    low: quote.low[index],
    close: quote.close[index],
    volume: quote.volume[index]
  }));
}

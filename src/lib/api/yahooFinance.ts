import axios from 'axios';
import type { StockData } from '../types';

const BASE_URL = '/yahoo-finance/v8/finance/chart';

export async function fetchYahooFinanceData(symbol: string, interval: string, range: string): Promise<StockData[]> {
  try {
    const nsSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
    
    console.log(`Fetching data for symbol: ${nsSymbol}, interval: ${interval}, range: ${range}`);
    
    const response = await axios.get(`${BASE_URL}/${nsSymbol}`, {
      params: {
        interval: interval,
        range: range,
        includePrePost: false,
        events: 'div,split'
      },
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (typeof response.data === 'string') {
      throw new Error('Received HTML instead of JSON. Proxy might not be working correctly.');
    }

    if (!response.data || !response.data.chart || !Array.isArray(response.data.chart.result) || response.data.chart.result.length === 0) {
      throw new Error('Invalid data structure received from Yahoo Finance');
    }

    const result = response.data.chart.result[0];
    
    if (!result.timestamp || !result.indicators || !result.indicators.quote || !Array.isArray(result.indicators.quote) || result.indicators.quote.length === 0) {
      throw new Error('Missing required data fields from Yahoo Finance response');
    }

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


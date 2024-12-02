export interface Stock {
  Symbol: string;
  "Company Name": string;
  // Add any other properties that your stock objects have
}

export interface StockData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Interval {
  label: string;
  value: string;
  range: string;
}


import { writable } from 'svelte/store';
import type { Stock, StockData, Interval } from '../types';

export const stocks = writable<Stock[]>([]);
export const currentStock = writable<Stock | null>(null);
export const stockData = writable<StockData[]>([]);
export const loading = writable<boolean>(false);
export const error = writable<string | null>(null);
export const favorites = writable<Stock[]>([]);
export const selectedInterval = writable<Interval>({ label: 'Daily', value: '1d', range: '1y' });


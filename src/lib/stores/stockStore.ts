import { writable } from 'svelte/store';
import type { Stock, StockData } from '../types';

export const stocks = writable<Stock[]>([]);
export const currentStock = writable<Stock | null>(null);
export const stockData = writable<StockData[]>([]);
export const loading = writable<boolean>(false);
export const error = writable<string | null>(null);


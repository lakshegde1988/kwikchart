import { get, writable, derived } from 'svelte/store';
import type { Stock, StockData } from '../types';
export const stocks = writable<Stock[]>([]);
export const currentStock = writable<Stock | null>(null);
export const stockData = writable<StockData[]>([]);
export const loading = writable<boolean>(false);
export const error = writable<string | null>(null);

const storedFavorites = typeof window !== 'undefined' ? localStorage.getItem('favoriteStocks') : null;
export const favorites = writable<Set<string>>(new Set(storedFavorites ? JSON.parse(storedFavorites) : []));

favorites.subscribe(value => {
  localStorage.setItem('favoriteStocks', JSON.stringify(Array.from(value)));
});

export function toggleFavorite(symbol: string) {
  favorites.update(favs => {
    if (favs.has(symbol)) {
      favs.delete(symbol);
    } else {
      favs.add(symbol);
    }
    localStorage.setItem('favoriteStocks', JSON.stringify(Array.from(favs)));
    return favs;
  });
}

export function exportFavorites(): string {
  return JSON.stringify(Array.from(get(favorites)));
}

export function importFavorites(favoritesJson: string) {
  try {
    const importedFavorites = JSON.parse(favoritesJson);
    if (Array.isArray(importedFavorites)) {
      favorites.set(new Set(importedFavorites));
      localStorage.setItem('favoriteStocks', JSON.stringify(importedFavorites));
    }
  } catch (error) {
    console.error('Error importing favorites:', error);
    throw new Error('Invalid favorites data');
  }
}


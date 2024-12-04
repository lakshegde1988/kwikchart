import { writable, derived } from 'svelte/store';
import type { Stock, StockData } from '../types';

export const stocks = writable<Stock[]>([]);
export const currentStock = writable<Stock | null>(null);
export const stockData = writable<StockData[]>([]);
export const loading = writable<boolean>(false);
export const error = writable<string | null>(null);

// New additions for favorites feature
export const favorites = writable<Set<string>>(new Set());

export function toggleFavorite(symbol: string) {
  favorites.update(favs => {
    if (favs.has(symbol)) {
      favs.delete(symbol);
    } else {
      favs.add(symbol);
    }
    return favs;
  });
}

export const favoriteStocks = derived(
  [stocks, favorites],
  ([$stocks, $favorites]) => $stocks.filter(stock => $favorites.has(stock.Symbol))
);

// Function to save favorites to local storage
export function saveFavoritesToLocalStorage() {
  if (typeof window !== 'undefined') {
    favorites.subscribe(favs => {
      localStorage.setItem('favoriteStocks', JSON.stringify(Array.from(favs)));
    });
  }
}

// Function to load favorites from local storage
export function loadFavoritesFromLocalStorage() {
  if (typeof window !== 'undefined') {
    const storedFavorites = localStorage.getItem('favoriteStocks');
    if (storedFavorites) {
      favorites.set(new Set(JSON.parse(storedFavorites)));
    }
  }
}

// Call this function when your app initializes
export function initializeFavorites() {
  loadFavoritesFromLocalStorage();
  saveFavoritesToLocalStorage();
}

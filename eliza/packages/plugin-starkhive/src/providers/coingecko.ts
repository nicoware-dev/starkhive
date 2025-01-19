import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import axios from 'axios';

const BASE_URL = 'https://api.coingecko.com/api/v3';

// Predefined list of tokens to track with correct CoinGecko IDs
const TRACKED_TOKENS = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
  { id: 'tether', symbol: 'usdt', name: 'Tether' },
  { id: 'starknet', symbol: 'stark', name: 'Starknet' },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB' },
  { id: 'solana', symbol: 'sol', name: 'Solana' },
  { id: 'cardano', symbol: 'ada', name: 'Cardano' },
  { id: 'ripple', symbol: 'xrp', name: 'XRP' },
  { id: 'polkadot', symbol: 'dot', name: 'Polkadot' },
  { id: 'matic-network', symbol: 'matic', name: 'Polygon' }
];

type TokenInfo = typeof TRACKED_TOKENS[number];

// Types for API responses
interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  total_volume: number;
}

// Cache configuration
const CACHE_DURATION = 30 * 1000; // 30 seconds
interface CacheData {
  marketData: CoinGeckoMarketData[] | null;
  timestamp: number;
}

let marketDataCache: CacheData = {
  marketData: null,
  timestamp: 0
};

// Helper function to check if cache is valid
function isCacheValid(): boolean {
  return Date.now() - marketDataCache.timestamp < CACHE_DURATION && marketDataCache.marketData !== null;
}

// Initialize axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Format currency with appropriate decimal places
function formatCurrency(value: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 1000 ? 2 : 4,
    maximumFractionDigits: value >= 1000 ? 2 : 6
  }).format(value);
}

// Format price change percentage
function formatPriceChange(value: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '+0.00%';
  }
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

async function fetchMarketData(requestedTokens: TokenInfo[]): Promise<CoinGeckoMarketData[]> {
  // Check cache first
  if (isCacheValid() && marketDataCache.marketData) {
    return marketDataCache.marketData;
  }

  try {
    console.log('Fetching prices for tokens:', requestedTokens.map(t => t.id).join(','));

    const response = await api.get<CoinGeckoMarketData[]>('/coins/markets', {
      params: {
        vs_currency: 'usd',
        ids: requestedTokens.map(t => t.id).join(','),
        order: 'market_cap_desc',
        sparkline: false,
        price_change_percentage: '24h',
        per_page: requestedTokens.length,
        precision: 6
      }
    });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response from CoinGecko API');
    }

    // Sort data to match our predefined order and validate the data
    const sortedData = requestedTokens.map(token => {
      const coinData = response.data.find(d => d.id === token.id);
      if (!coinData) {
        console.warn(`No data found for token: ${token.id}`);
        return undefined;
      }
      if (typeof coinData.current_price !== 'number' || Number.isNaN(coinData.current_price)) {
        console.warn(`Invalid price for token: ${token.id}`);
        return undefined;
      }
      return coinData;
    }).filter((d): d is CoinGeckoMarketData => d !== undefined);

    if (sortedData.length === 0) {
      throw new Error('No valid price data received from CoinGecko API');
    }

    // Update cache
    marketDataCache = {
      marketData: sortedData,
      timestamp: Date.now()
    };

    return sortedData;
  } catch (error) {
    console.error('Error fetching market data:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch market data: ${error.message}`);
    }
    throw new Error('Failed to fetch market data');
  }
}

export const coinGeckoProvider: Provider = {
  async get(_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<string> {
    try {
      let marketData: CoinGeckoMarketData[];
      const requestedTokens = message.content?.text?.toLowerCase().match(/\b(btc|eth|usdt|stark|bnb|sol|ada|xrp|dot|matic)\b/g);

      if (requestedTokens && requestedTokens.length > 0) {
        const matchedTokens = requestedTokens
          .map(symbol => TRACKED_TOKENS.find(t => t.symbol.toLowerCase() === symbol))
          .filter((t): t is TokenInfo => t !== undefined);

        if (matchedTokens.length > 0) {
          marketData = await fetchMarketData(matchedTokens);
        } else {
          marketData = await fetchMarketData(TRACKED_TOKENS);
        }
      } else {
        marketData = await fetchMarketData(TRACKED_TOKENS);
      }

      if (!marketData.length) {
        return 'Sorry, I couldn\'t fetch the current cryptocurrency prices. Please try again later.';
      }

      return [
        'Current Cryptocurrency Prices:',
        '',
        ...marketData.map(token =>
          `• ${token.name} (${token.symbol.toUpperCase()}): ${formatCurrency(token.current_price)} (${formatPriceChange(token.price_change_percentage_24h)})`
        ),
        '',
        'Prices are updated every 30 seconds. Let me know if you need specific tokens or more market data!'
      ].join('\n');
    } catch (error) {
      console.error('Error in CoinGecko provider:', error);
      return `Error fetching prices: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

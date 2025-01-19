import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import axios from 'axios';

// Types
interface ChainTVLData {
  name: string;
  tvl: number;
  chainId: string;
  tokenSymbol: string;
}

interface ProtocolData {
  id: string;
  name: string;
  chain: string;
  tvl: number;
  chainTvls: {
    [key: string]: number;
  };
  symbol: string;
  category: string;
}

interface TVLMetrics {
  tvl: number;
  protocols: Array<{ name: string; tvl: number }>;
  globalMetrics: {
    totalTvl: number;
    starknetPercentage: number;
    topChains: Array<{
      name: string;
      tvl: number;
      percentage: number;
    }>;
  };
}

// Cache configuration
const CACHE_DURATION = 30 * 1000; // 30 seconds
let tvlCache: { data: TVLMetrics | null; timestamp: number } = {
  data: null,
  timestamp: 0
};

// Helper function to check if cache is valid
function isCacheValid(): boolean {
  return Date.now() - tvlCache.timestamp < CACHE_DURATION;
}

// Format TVL numbers to be more readable
function formatTVL(tvl: number): string {
  const billion = 1000000000;
  const million = 1000000;
  if (tvl >= billion) {
    return `$${(tvl / billion).toFixed(2)}B`;
  }
  return `$${(tvl / million).toFixed(2)}M`;
}

// Format percentage with 2 decimal places
function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

async function fetchTVLData(): Promise<TVLMetrics> {
  // Check cache first
  if (isCacheValid() && tvlCache.data) {
    return tvlCache.data;
  }

  try {
    const [chainResponse, protocolsResponse] = await Promise.all([
      axios.get<ChainTVLData[]>('https://api.llama.fi/v2/chains'),
      axios.get<ProtocolData[]>('https://api.llama.fi/protocols')
    ]);

    const totalTvl = chainResponse.data.reduce((sum, chain) => sum + chain.tvl, 0);
    const starknetData = chainResponse.data.find((chain) => chain.name.toLowerCase() === 'starknet');
    const starknetTvl = starknetData?.tvl || 0;
    const starknetPercentage = starknetTvl / totalTvl;

    const topChains = chainResponse.data
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 5)
      .map(chain => ({
        name: chain.name,
        tvl: chain.tvl,
        percentage: chain.tvl / totalTvl
      }));

    const starknetProtocols = protocolsResponse.data
      .filter((protocol) => protocol.chain === 'Starknet' || (protocol.chainTvls && protocol.chainTvls.Starknet > 0))
      .map((protocol) => ({
        name: protocol.name,
        tvl: protocol.chainTvls?.Starknet || (protocol.chain === 'Starknet' ? protocol.tvl : 0)
      }))
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 3);

    const metrics: TVLMetrics = {
      tvl: starknetTvl,
      protocols: starknetProtocols,
      globalMetrics: {
        totalTvl,
        starknetPercentage,
        topChains
      }
    };

    // Update cache
    tvlCache = {
      data: metrics,
      timestamp: Date.now()
    };

    return metrics;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch TVL data: ${error.message}`);
    }
    throw new Error('Failed to fetch TVL data');
  }
}

export const defiLlamaProvider: Provider = {
  async get(_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string> {
    try {
      const data = await fetchTVLData();

      return [
        'Here are the detailed TVL metrics:',
        '',
        'Starknet Network Ecosystem:',
        `• Total TVL: ${formatTVL(data.tvl)}`,
        `• Market Share: ${formatPercentage(data.globalMetrics.starknetPercentage)}`,
        '',
        'Top Starknet Protocols:',
        ...data.protocols.map((p, i) => `${i + 1}. ${p.name}: ${formatTVL(p.tvl)}`),
        '',
        'Global DeFi Overview:',
        `• Total DeFi TVL: ${formatTVL(data.globalMetrics.totalTvl)}`,
        '',
        'Top Chains by TVL:',
        ...data.globalMetrics.topChains.map((chain, i) =>
          `${i + 1}. ${chain.name}: ${formatTVL(chain.tvl)} (${formatPercentage(chain.percentage)})`
        )
      ].join('\n');
    } catch (error) {
      return `Error fetching TVL data: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

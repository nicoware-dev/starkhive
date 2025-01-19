import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { Account, RpcProvider, Contract } from "starknet";
import { formatEther } from "viem";

// Token contracts on Starknet Mainnet
const TOKEN_ADDRESSES = {
    ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
};

// ABI for ERC20 token contracts
const ERC20_ABI = [
    {
        name: "balanceOf",
        type: "function",
        inputs: [{ name: "account", type: "felt" }],
        outputs: [{ name: "balance", type: "Uint256" }],
        stateMutability: "view"
    }
];

interface TokenBalance {
    symbol: string;
    balance: string;
    usdValue: number;
}

async function getTokenPrice(symbol: string): Promise<number> {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${getCoingeckoId(symbol)}&vs_currencies=usd`);
        const data = await response.json();
        return data[getCoingeckoId(symbol)]?.usd || 0;
    } catch (error) {
        console.error(`Error fetching ${symbol} price:`, error);
        return 0;
    }
}

function getCoingeckoId(symbol: string): string {
    switch (symbol.toLowerCase()) {
        case 'eth':
            return 'ethereum';
        case 'strk':
            return 'starknet';
        default:
            return symbol.toLowerCase();
    }
}

interface Uint256Struct {
    low?: string | number | bigint;
    high?: string | number | bigint;
}

function parseUint256(value: unknown): bigint {
    if (!value) return BigInt(0);

    // Handle different Uint256 response formats
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    if (typeof value === 'string') return BigInt(value);

    // Handle Uint256 struct with low/high
    if (typeof value === 'object' && value !== null) {
        const uint256 = value as Uint256Struct;
        if (uint256.low !== undefined) {
            const low = BigInt(uint256.low.toString());
            const high = uint256.high ? BigInt(uint256.high.toString()) * BigInt('0x100000000000000000000000000000000') : BigInt(0);
            return low + high;
        }

        // Handle array-like response [low, high]
        if (Array.isArray(value)) {
            const [low, high] = value;
            if (low !== undefined) {
                return BigInt(low.toString()) + (high ? BigInt(high.toString()) * BigInt('0x100000000000000000000000000000000') : BigInt(0));
            }
        }

        // Handle object with numeric properties
        const values = Object.values(value);
        if (values.length > 0) {
            if (values.length === 2) {
                const [low, high] = values;
                return BigInt(low.toString()) + (high ? BigInt(high.toString()) * BigInt('0x100000000000000000000000000000000') : BigInt(0));
            }
            return BigInt(values[0].toString());
        }
    }

    return BigInt(0);
}

export function getStarknetWalletClient(runtime: IAgentRuntime) {
    const privateKey = runtime.getSetting("STARKNET_PRIVATE_KEY");
    if (!privateKey) {
        console.error("No STARKNET_PRIVATE_KEY found in settings");
        return null;
    }

    const accountAddress = runtime.getSetting("STARKNET_ADDRESS");
    if (!accountAddress) {
        console.error("No STARKNET_ADDRESS found in settings");
        return null;
    }

    const rpcUrl = runtime.getSetting("STARKNET_RPC_URL") || "https://starknet-mainnet.public.blastapi.io";

    try {
        const provider = new RpcProvider({ nodeUrl: rpcUrl });
        const account = new Account(provider, accountAddress, privateKey);

        return {
            getAddress: () => account.address,
            getTokenBalance: async (tokenAddress: string): Promise<string> => {
                try {
                    const contract = new Contract(ERC20_ABI, tokenAddress, provider);
                    const result = await contract.balanceOf(account.address);
                    if (!result) {
                        throw new Error("Invalid balance response from contract");
                    }

                    const balanceValue = parseUint256(result.balance);
                    return formatEther(balanceValue);
                } catch (error) {
                    console.error("Error fetching token balance:", error);
                    throw error;
                }
            },
            getAllBalances: async (): Promise<TokenBalance[]> => {
                const balances: TokenBalance[] = [];
                const prices: Record<string, number> = {};

                // Fetch all token prices in parallel
                await Promise.all(
                    Object.keys(TOKEN_ADDRESSES).map(async (symbol) => {
                        prices[symbol] = await getTokenPrice(symbol);
                    })
                );

                // Fetch all token balances in parallel
                const tokenBalances = await Promise.all(
                    Object.entries(TOKEN_ADDRESSES).map(async ([symbol, address]) => {
                        try {
                            const contract = new Contract(ERC20_ABI, address, provider);
                            const result = await contract.balanceOf(account.address);
                            const balance = formatEther(parseUint256(result.balance));
                            return {
                                symbol,
                                balance,
                                price: prices[symbol]
                            };
                        } catch (error) {
                            console.error(`Error fetching ${symbol} balance:`, error);
                            return {
                                symbol,
                                balance: "0",
                                price: prices[symbol]
                            };
                        }
                    })
                );

                return tokenBalances.map(({ symbol, balance, price }) => ({
                    symbol,
                    balance,
                    usdValue: Number.parseFloat(balance) * (price || 0)
                }));
            }
        };
    } catch (error) {
        console.error("Error creating Starknet wallet client:", error);
        return null;
    }
}

export function getStarknetWalletProvider(
    walletClient: ReturnType<typeof getStarknetWalletClient>
) {
    return {
        async get(): Promise<string> {
            if (!walletClient) {
                return "Starknet wallet not configured. Please set STARKNET_PRIVATE_KEY and STARKNET_ADDRESS in your environment.";
            }

            try {
                const address = walletClient.getAddress();
                const balances = await walletClient.getAllBalances();

                let totalUsdValue = 0;
                const balanceStrings = balances.map(({ symbol, balance, usdValue }) => {
                    totalUsdValue += usdValue;
                    return `${symbol}: ${balance} ($${usdValue.toFixed(2)})`;
                });

                return [
                    `Starknet Wallet Address: ${address}`,
                    ...balanceStrings,
                    `Total Value: $${totalUsdValue.toFixed(2)}`
                ].join('\n');
            } catch (error) {
                console.error("Error in Starknet wallet provider:", error);
                return `Error fetching wallet information: ${error instanceof Error ? error.message : String(error)}`;
            }
        },
    };
}

export const walletProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string> => {
        try {
            const walletClient = getStarknetWalletClient(runtime);
            const provider = getStarknetWalletProvider(walletClient);
            return provider.get();
        } catch (error) {
            console.error("Error in wallet provider:", error);
            return "Error accessing wallet provider. Please check your configuration.";
        }
    },
};

export default walletProvider;

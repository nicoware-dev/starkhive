import { StarknetConfig, InjectedConnector, publicProvider } from '@starknet-react/core';
import { mainnet, sepolia } from '@starknet-react/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

interface Props {
    children: React.ReactNode;
}

// Chain configuration
const isMainnet = (process.env.NEXT_PUBLIC_STARKNET_NETWORK || 'testnet') === 'mainnet';
const chains = [isMainnet ? mainnet : sepolia];

// Available connectors
const connectors = [
    new InjectedConnector({ options: { id: "argentX" } }),
    new InjectedConnector({ options: { id: "braavos" } }),
    new InjectedConnector({ options: { id: "metamask" } })
];

const queryClient = new QueryClient();

export function WalletProvider({ children }: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Delay mounting to avoid ethereum provider conflicts
        setTimeout(() => {
            setMounted(true);
        }, 500);
    }, []);

    if (!mounted) return null;

    return (
        <QueryClientProvider client={queryClient}>
            <StarknetConfig
                chains={chains}
                provider={publicProvider()}
                connectors={connectors}
            >
                {children}
            </StarknetConfig>
        </QueryClientProvider>
    );
}

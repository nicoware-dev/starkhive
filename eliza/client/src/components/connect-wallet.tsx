import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import type { StarknetkitConnector } from 'starknetkit';
import { useStarknetkitConnectModal } from 'starknetkit';
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ConnectWallet() {
    const { address, isConnected } = useAccount();
    const { connectAsync, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();
    const [mounted, setMounted] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    const { starknetkitConnectModal } = useStarknetkitConnectModal({
        connectors: connectors as StarknetkitConnector[],
        modalTheme: "dark",
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const formatAddress = (addr: string) => {
        if (!addr) return '';
        const hex = addr.slice(0, 2);
        const start = addr.slice(2, 6);
        const end = addr.slice(-4);
        return `${hex}${start}…${end}`;
    };

    const handleConnect = async () => {
        if (isConnecting || isPending) return;
        try {
            setIsConnecting(true);
            const { connector } = await starknetkitConnectModal();
            if (!connector) return;
            await connectAsync({ connector });
        } catch (error) {
            console.error('Connection error:', error);
        } finally {
            setIsConnecting(false);
        }
    };

    if (isConnected && address) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-medium">
                                {formatAddress(address)}
                            </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        className="text-red-500 focus:text-red-500 cursor-pointer"
                        onClick={() => disconnect()}
                    >
                        Disconnect
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <Button
            onClick={handleConnect}
            disabled={isConnecting || isPending}
            style={{ backgroundColor: '#7f00ff', color: 'white' }}
            className="hover:bg-[#7f00ff]/90"
        >
            {(isConnecting || isPending) ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                </>
            ) : (
                <span>Connect Wallet</span>
            )}
        </Button>
    );
}

"use client";

import { Wallet, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface WalletInfo {
    address: string;
    isDefault: boolean;
    isConnected: boolean;
    balance: string;
    network: string;
}

const mockWallets: WalletInfo[] = [
    {
        address: '0x1234...5678',
        isDefault: true,
        isConnected: true,
        balance: '1.234 ETH',
        network: 'Mainnet'
    },
    {
        address: '0x8765...4321',
        isDefault: false,
        isConnected: true,
        balance: '0.567 ETH',
        network: 'Testnet'
    }
];

function WalletCard({ address, isDefault, isConnected, balance, network }: WalletInfo) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-sm font-medium flex items-center">
                        {address}
                        {isDefault && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                                Default
                            </span>
                        )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{network}</p>
                </div>
                {isConnected ? (
                    <Check className="h-4 w-4 text-green-500" />
                ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Balance</span>
                        <span className="text-sm font-medium">{balance}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <span className="text-sm font-medium">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor={`default-${address}`} className="text-sm text-muted-foreground">
                            Set as Default
                        </Label>
                        <Switch
                            id={`default-${address}`}
                            checked={isDefault}
                            onCheckedChange={() => {}}
                            disabled={isDefault}
                        />
                    </div>
                    <Button
                        variant={isConnected ? "destructive" : "default"}
                        className="w-full"
                    >
                        {isConnected ? 'Disconnect' : 'Connect'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function NetworkSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Network Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Network Selection</Label>
                    <RadioGroup defaultValue="mainnet">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="mainnet" id="mainnet" />
                            <Label htmlFor="mainnet">Mainnet</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="testnet" id="testnet" />
                            <Label htmlFor="testnet">Testnet</Label>
                        </div>
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="rpc-endpoint">RPC Endpoint</Label>
                    <input
                        type="text"
                        id="rpc-endpoint"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        placeholder="https://..."
                        defaultValue="https://mainnet.infura.io/v3/..."
                    />
                </div>
                <Button className="w-full">
                    Save Network Settings
                </Button>
            </CardContent>
        </Card>
    );
}

export function WalletConfiguration() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                {mockWallets.map((wallet) => (
                    <WalletCard key={wallet.address} {...wallet} />
                ))}
            </div>
            <Button className="w-full">
                <Wallet className="mr-2 h-4 w-4" />
                Connect New Wallet
            </Button>
            <NetworkSettings />
        </div>
    );
}

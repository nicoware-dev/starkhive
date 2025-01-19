import { RpcProvider, Account } from "starknet";
import { type IAgentRuntime } from "@elizaos/core";

export function getStarknetProvider(runtime: IAgentRuntime): RpcProvider {
    const nodeUrl = runtime.getSetting("STARKNET_RPC_URL") || "https://1rpc.io/starknet";
    return new RpcProvider({ nodeUrl });
}

export function getStarknetAccount(runtime: IAgentRuntime): Account {
    const provider = getStarknetProvider(runtime);
    const privateKey = runtime.getSetting("STARKNET_PRIVATE_KEY");
    const accountAddress = runtime.getSetting("STARKNET_ADDRESS");

    if (!privateKey || !accountAddress) {
        throw new Error("Missing STARKNET_PRIVATE_KEY or STARKNET_ADDRESS environment variables");
    }

    return new Account(provider, accountAddress, privateKey);
}

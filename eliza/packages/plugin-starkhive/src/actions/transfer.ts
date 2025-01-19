// TODO: Implement this for Starknet.
// It should just transfer tokens from the agent's wallet to the recipient.

import type { Action, ActionExample, Content, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { composeContext, elizaLogger, generateObjectDeprecated, ModelClass } from "@elizaos/core";
import { getStarknetAccount } from "../utils";
import { ERC20Token } from "../utils/ERC20Token";
import { validateStarknetConfig } from "../environment";
import { getAddressFromName, isStarkDomain } from "../utils/starknetId";

export interface TransferContent extends Content {
    tokenAddress: string;
    recipient?: string;
    starkName?: string;
    amount: string | number;
}

export function isTransferContent(content: unknown): content is TransferContent {
    if (!content || typeof content !== 'object') {
        return false;
    }

    const transferContent = content as TransferContent;

    // Validate required fields exist
    if (!transferContent.tokenAddress || !transferContent.amount) {
        return false;
    }

    // Validate types
    if (typeof transferContent.tokenAddress !== "string" ||
        (typeof transferContent.amount !== "string" && typeof transferContent.amount !== "number")) {
        return false;
    }

    // At least one of recipient or starkName must be present
    if (!transferContent.recipient && !transferContent.starkName) {
        return false;
    }

    // Validate tokenAddress (must be 32-bytes long with 0x prefix)
    if (!transferContent.tokenAddress.startsWith("0x") || transferContent.tokenAddress.length !== 66) {
        return false;
    }

    // Additional checks based on whether recipient or starkName is defined
    if (transferContent.recipient) {
        // Validate recipient address (must be 32-bytes long with 0x prefix)
        if (!transferContent.recipient.startsWith("0x") || transferContent.recipient.length !== 66) {
            return false;
        }
    }

    if (transferContent.starkName) {
        // .stark name validation
        if (!isStarkDomain(transferContent.starkName)) {
            return false;
        }
    }

    return true;
}

const transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

For the amount to send, extract the exact amount specified in the message.

These are known token addresses:
- BTC/btc: 0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac
- ETH/eth: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
- STRK/strk: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
- LORDS/lords: 0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49

Example response:
\`\`\`json
{
    "tokenAddress": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    "recipient": "0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
    "starkName": null,
    "amount": "0.1"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Token contract address
- Recipient wallet address
- Recipient .stark name (if provided)
- Amount to transfer

Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "SEND_TOKEN",
    similes: [
        "TRANSFER_TOKEN_ON_STARKNET",
        "TRANSFER_TOKENS_ON_STARKNET",
        "SEND_TOKENS_ON_STARKNET",
        "SEND_ETH_ON_STARKNET",
        "PAY_ON_STARKNET",
    ],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateStarknetConfig(runtime);
        return true;
    },
    description:
        "MUST use this action if the user requests send a token or transfer a token, the request might be varied, but it will always be a token transfer. If the user requests a transfer of lords, use this action.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        initialState: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting SEND_TOKEN handler...");

        // Initialize or update state
        const state = !initialState
            ? await runtime.composeState(message)
            : await runtime.updateRecentMessageState(initialState);

        // Compose transfer context
        const transferContext = composeContext({
            state,
            template: transferTemplate,
        });

        // Generate transfer content
        const content = await generateObjectDeprecated({
            runtime,
            context: transferContext,
            modelClass: ModelClass.MEDIUM,
        });

        elizaLogger.debug("Transfer content:", content);

        // Validate transfer content
        if (!isTransferContent(content)) {
            elizaLogger.error("Invalid content for TRANSFER_TOKEN action.");
            if (callback) {
                callback({
                    text: "Not enough information to transfer tokens. Please provide the token address, recipient address or stark name, and amount.",
                    content: { error: "Invalid transfer content" },
                });
            }
            return false;
        }

        try {
            const account = getStarknetAccount(runtime);
            const erc20Token = new ERC20Token(content.tokenAddress, account);
            const decimals = await erc20Token.decimals();

            // Convert decimal amount to integer before converting to BigInt
            const amountInteger = Math.floor(Number(content.amount) * (10 ** Number(decimals)));
            const amountWei = BigInt(amountInteger.toString());

            // Get recipient address
            let recipientAddress: string;
            if (content.recipient) {
                recipientAddress = content.recipient;
            } else if (content.starkName) {
                recipientAddress = await getAddressFromName(account, content.starkName);
                if (!recipientAddress) {
                    throw new Error(`Could not resolve address for ${content.starkName}`);
                }
            } else {
                throw new Error("No recipient address or stark name provided");
            }

            const transferCall = erc20Token.transferCall(recipientAddress, amountWei);

            elizaLogger.success(
                `Transferring ${content.amount} tokens from ${content.tokenAddress} to ${recipientAddress}`
            );

            const tx = await account.execute(transferCall);

            elizaLogger.success(`Transfer completed successfully! tx: ${tx.transaction_hash}`);
            if (callback) {
                callback({
                    text: `Transfer completed successfully! tx: ${tx.transaction_hash}`,
                    content: { transactionHash: tx.transaction_hash },
                });
            }

            return true;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            elizaLogger.error("Error during token transfer:", errorMessage);
            if (callback) {
                callback({
                    text: `Error transferring tokens: ${errorMessage}`,
                    content: { error: errorMessage },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 0.1 STRK to 0x060ce783C1BD3416101C6EA0F73dfe987ec314f12E683eA3Cf383A5f1949f584",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll transfer 0.1 STRK to that address right away. Let me process that for you.",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 10 ETH to domain.stark",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll transfer 10 ETH to domain.stark. Let me process that for you.",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

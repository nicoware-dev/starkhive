import {
    type Action,
    ActionExample,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import { Percent } from "@uniswap/sdk-core";
import { createMemecoin, launchOnEkubo } from "unruggable-sdk";
import { Call, Abi, ExecuteOptions } from "starknet";

import { getStarknetAccount, getStarknetProvider } from "../utils/index.ts";
// import { DeployData, Factory } from "@unruggable_starknet/core";
// import { AMM, QUOTE_TOKEN_SYMBOL } from "@unruggable_starknet/core/constants";
import { ACCOUNTS, TOKENS } from "../utils/constants.ts";
import { validateStarknetConfig } from "../environment.ts";

// interface SwapContent {
//     sellTokenAddress: string;
//     buyTokenAddress: string;
//     sellAmount: string;
// }

interface DeployTokenContent {
    name: string;
    symbol: string;
    owner: string;
    initialSupply: string;
}

export function isDeployTokenContent(content: DeployTokenContent) {
    // Validate types
    const validTypes =
        typeof content.name === "string" &&
        typeof content.symbol === "string" &&
        typeof content.owner === "string" &&
        typeof content.initialSupply === "string";
    if (!validTypes) {
        return false;
    }

    // Validate addresses (must be 32-bytes long with 0x prefix)
    const validAddresses =
        content.name.length > 2 &&
        content.symbol.length > 2 &&
        parseInt(content.initialSupply) > 0 &&
        content.owner.startsWith("0x") &&
        content.owner.length === 66;

    return validAddresses;
}

const deployTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "name": "Brother",
    "symbol": "BROTHER",
    "owner": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "initialSupply": "1000000000000000000"
}
\`\`\`

{{recentMessages}}

Extract the following information about the requested token deployment:
- Token Name
- Token Symbol
- Token Owner
- Token initial supply

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

export const deployToken: Action = {
    name: "DEPLOY_STARKNET_UNRUGGABLE_MEME_TOKEN",
    similes: [
        "DEPLOY_STARKNET_UNRUGGABLE_TOKEN",
        "STARKNET_DEPLOY_MEMECOIN",
        "STARKNET_CREATE_MEMECOIN",
    ],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateStarknetConfig(runtime);
        return true;
    },
    description:
        "Deploy an Unruggable Memecoin on Starknet. Use this action when a user asks you to deploy a new token on Starknet.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log(
            "Starting DEPLOY_STARKNET_UNRUGGABLE_MEME_TOKEN handler..."
        );
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const deployContext = composeContext({
            state,
            template: deployTemplate,
        });

        const response = await generateObjectDeprecated({
            runtime,
            context: deployContext,
            modelClass: ModelClass.MEDIUM,
        });

        elizaLogger.log(`init supply: ${response.initialSupply}`);
        elizaLogger.log(response);

        if (!isDeployTokenContent(response)) {
            callback?.({
                text: "Invalid deployment content, please try again.",
            });
            return false;
        }

        try {
            const provider = getStarknetProvider(runtime);
            const account = getStarknetAccount(runtime);

            const chainId = await provider.getChainId();
            const config = {
                starknetChainId: chainId,
                starknetProvider: provider,
            };

            const { tokenAddress, transactionHash } = await createMemecoin(
                config,
                {
                    name: response.name,
                    symbol: response.symbol,
                    owner: response.owner,
                    initialSupply: response.initialSupply,
                    starknetAccount: account,
                }
            );

            elizaLogger.log(
                `Token deployment initiated for: ${response.name} at address: ${tokenAddress}`
            );

            // Wait for token deployment to be confirmed
            elizaLogger.log("Waiting for token deployment to be confirmed...");
            let isDeployed = false;
            for (let i = 0; i < 30; i++) { // Try for 2.5 minutes
                try {
                    const code = await provider.getClassAt(tokenAddress);
                    if (code) {
                        isDeployed = true;
                        break;
                    }
                } catch (e) {
                    // Ignore error and continue waiting
                }
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between checks
            }

            if (!isDeployed) {
                throw new Error("Token deployment not confirmed after waiting. Please check the transaction status.");
            }

            elizaLogger.log("Token deployment confirmed. Proceeding with Ekubo launch...");

            // Prepare the launch parameters exactly as the contract expects
            const launchParams = {
                memecoin_address: tokenAddress,
                transfer_restriction_delay: "0x015180", // 24 hours in seconds
                max_percentage_buy_launch: "0x64", // 100 in hex
                quote_address: TOKENS.ETH,
                initial_holders: [],
                initial_holders_amounts: []
            };

            const ekuboParams = {
                fee: "0xc49ba5e353f7ced916872b020c49ba",
                tick_spacing: "0x175e",
                starting_price: {
                    mag: "0x868b3c",
                    sign: true
                },
                bound: "0x0549bec2"
            };

            elizaLogger.log("Launching on Ekubo with params:", {
                launchParams,
                ekuboParams
            });

            try {
                // Call the contract directly with the correct parameters
                const factoryAddress = "0x1a46467a9246f45c8c340f1f155266a26a71c07bd55d36e8d1c7d0d438a2dbc";
                const calldata = [
                    launchParams.memecoin_address,
                    launchParams.transfer_restriction_delay,
                    launchParams.max_percentage_buy_launch,
                    launchParams.quote_address,
                    0, // array len for initial_holders
                    0, // array len for initial_holders_amounts
                    ekuboParams.fee,
                    ekuboParams.tick_spacing,
                    ekuboParams.starting_price.mag,
                    ekuboParams.starting_price.sign ? "1" : "0",
                    ekuboParams.bound
                ];

                const result = await account.execute({
                    contractAddress: factoryAddress,
                    entrypoint: "launch_on_ekubo",
                    calldata
                });

                elizaLogger.log("Ekubo launch result:", result);

                // Wait for transaction confirmation
                const txReceipt = await provider.waitForTransaction(result.transaction_hash, {
                    retryInterval: 1000,
                    successStates: ['ACCEPTED_ON_L2'],
                });

                elizaLogger.log("Transaction confirmed:", txReceipt);

                callback?.({
                    text: `Token Deployment and Ekubo launch completed successfully! ${response.symbol} deployed in tx: ${transactionHash}. Ekubo launch tx: ${result.transaction_hash}. Token Contract Address: ${tokenAddress}`,
                });

                return true;
            } catch (ekuboError: unknown) {
                elizaLogger.error("Ekubo launch error details:", {
                    error: ekuboError,
                    stack: ekuboError instanceof Error ? ekuboError.stack : undefined,
                    message: ekuboError instanceof Error ? ekuboError.message : String(ekuboError),
                    type: typeof ekuboError,
                    keys: ekuboError instanceof Object ? Object.keys(ekuboError) : []
                });

                // Try one more time with adjusted parameters
                try {
                    elizaLogger.log("Retrying Ekubo launch with adjusted parameters...");

                    // Call the contract directly with lower fee
                    const factoryAddress = "0x1a46467a9246f45c8c340f1f155266a26a71c07bd55d36e8d1c7d0d438a2dbc";
                    const calldata = [
                        launchParams.memecoin_address,
                        launchParams.transfer_restriction_delay,
                        launchParams.max_percentage_buy_launch,
                        launchParams.quote_address,
                        0, // array len for initial_holders
                        0, // array len for initial_holders_amounts
                        ekuboParams.fee,
                        ekuboParams.tick_spacing,
                        ekuboParams.starting_price.mag,
                        ekuboParams.starting_price.sign ? "1" : "0",
                        ekuboParams.bound
                    ];

                    const retryResult = await account.execute({
                        contractAddress: factoryAddress,
                        entrypoint: "launch_on_ekubo",
                        calldata
                    }, undefined, {
                        maxFee: "0x4c4b40"
                    });

                    elizaLogger.log("Retry result:", retryResult);

                    // Wait for retry transaction confirmation
                    const retryTxReceipt = await provider.waitForTransaction(retryResult.transaction_hash, {
                        retryInterval: 1000,
                        successStates: ['ACCEPTED_ON_L2'],
                    });

                    elizaLogger.log("Retry transaction confirmed:", retryTxReceipt);

                    callback?.({
                        text: `Token Deployment and Ekubo launch completed successfully with adjusted parameters! ${response.symbol} deployed in tx: ${transactionHash}. Ekubo launch tx: ${retryResult.transaction_hash}. Token Address: ${tokenAddress}.`,
                    });

                    return true;
                } catch (retryError: unknown) {
                    elizaLogger.error("Retry error details:", {
                        error: retryError,
                        stack: retryError instanceof Error ? retryError.stack : undefined,
                        message: retryError instanceof Error ? retryError.message : String(retryError),
                        type: typeof retryError,
                        keys: retryError instanceof Object ? Object.keys(retryError) : []
                    });

                    throw new Error("Ekubo launch failed with both attempts. Please try again with different parameters.");
                }
            }
        } catch (error: unknown) {
            elizaLogger.error("Error during token deployment:", error);
            callback?.({
                text: `Error during deployment: ${error instanceof Error ? error.message : String(error)}`,
                content: { error: error instanceof Error ? error.message : String(error) },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Deploy a new token called Lords with the symbol LORDS, owned by 0x024BA6a4023fB90962bDfc2314F3B94372aa382D155291635fc3E6b777657A5B and initial supply of 1000000000000000000 on Starknet",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll deploy the Lords token to Starknet",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Deploy the SLINK coin to Starknet",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll deploy your coin on Starknet",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new coin on Starknet",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll create a new coin for you on Starknet",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

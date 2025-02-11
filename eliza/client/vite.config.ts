import { defineConfig } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [wasm(), topLevelAwait(), react()],
    optimizeDeps: {
        exclude: ["onnxruntime-node", "@anush008/tokenizers"],
        esbuildOptions: {
            target: 'es2020'
        }
    },
    build: {
        commonjsOptions: {
            exclude: ["onnxruntime-node", "@anush008/tokenizers"],
            include: [/node_modules/],
            transformMixedEsModules: true
        },
        rollupOptions: {
            external: ["onnxruntime-node", "@anush008/tokenizers"],
            output: {
                manualChunks: {
                    'recharts': ['recharts'],
                    'd3': ['d3-shape', 'd3-path']
                }
            }
        },
        target: 'es2020'
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            "d3-shape": 'd3-shape'
        }
    },
    server: {
        proxy: {
            "/api": {
                target: "https://7b71-45-238-221-26.ngrok-free.app",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path,
            },
        },
    },
    define: {
        'process.env': {
            NEXT_PUBLIC_STARKNET_NETWORK: process.env.NEXT_PUBLIC_STARKNET_NETWORK || 'testnet',
        },
        // Polyfill global objects
        global: 'globalThis',
    },
});

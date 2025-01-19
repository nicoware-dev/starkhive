import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { WalletProvider } from "./components/providers/wallet-provider";

// Simple Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        console.error('Error caught by boundary:', error);
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error details:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <div>Something went wrong. Please refresh the page.</div>;
        }
        return this.props.children;
    }
}

console.log('Starting application...');

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const root = createRoot(rootElement);

window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
});

root.render(
    <StrictMode>
        <ErrorBoundary>
            <WalletProvider>
                <RouterProvider router={router} />
            </WalletProvider>
        </ErrorBoundary>
    </StrictMode>
);

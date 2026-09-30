import { configureChains, createConfig } from 'wagmi';
import { avalanche } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { InjectedConnector } from '@wagmi/core';

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [avalanche],
  [publicProvider()]
);

// Simple configuration focused on Phantom wallet
export const config = createConfig({
  autoConnect: false,
  connectors: [
    new InjectedConnector({
      chains,
      options: {
        // Use injected provider's own name (MetaMask, Rabby, Core, Phantom EVM, etc.)
        shimDisconnect: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});

export { chains };

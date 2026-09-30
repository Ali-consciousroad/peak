"use client";

import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiConfig } from 'wagmi';
import { config, chains } from '@/lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

export default function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          chains={chains}
          theme={{
            blurs: {
              modalOverlay: 'blur(4px)',
            },
            colors: {
              accentColor: '#3b82f6',
              accentColorForeground: 'white',
              actionButtonBorder: 'rgba(255, 255, 255, 0.04)',
              actionButtonBorderMobile: 'rgba(255, 255, 255, 0.1)',
              actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.08)',
              closeButton: 'rgba(224, 232, 255, 0.6)',
              closeButtonBackground: 'rgba(255, 255, 255, 0.08)',
              connectButtonBackground: '#3b82f6',
              connectButtonBackgroundError: '#ff494a',
              connectButtonInnerBackground: 'linear-gradient(0deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.1))',
              connectButtonText: 'white',
              connectButtonTextError: 'white',
              connectionIndicator: '#30dc82',
              downloadBottomCardBackground: 'linear-gradient(126deg, rgba(255, 255, 255, 0) 9.49%, rgba(120, 119, 198, 0.100) 71.04%), rgba(255, 255, 255, 0.8)',
              downloadTopCardBackground: 'linear-gradient(126deg, rgba(255, 255, 255, 0.7) 9.49%, rgba(120, 119, 198, 0.05) 71.04%)',
              error: '#ff494a',
              generalBorder: 'rgba(255, 255, 255, 0.08)',
              generalBorderDim: 'rgba(255, 255, 255, 0.04)',
              menuItemBackground: 'rgba(224, 232, 255, 0.06)',
              modalBackdrop: 'rgba(0, 0, 0, 0.5)',
              modalBackground: 'rgba(255, 255, 255, 0.8)',
              modalBorder: 'rgba(255, 255, 255, 0.08)',
              modalText: 'black',
              modalTextDim: 'rgba(60, 60, 67, 0.6)',
              modalTextSecondary: 'rgba(60, 60, 67, 0.6)',
              profileAction: 'rgba(255, 255, 255, 0.1)',
              profileActionHover: 'rgba(255, 255, 255, 0.2)',
              profileForeground: 'rgba(224, 232, 255, 0.6)',
              selectedOptionBorder: 'rgba(224, 232, 255, 0.1)',
              standby: '#ffd641',
            },
            fonts: {
              body: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
            radii: {
              actionButton: '8px',
              connectButton: '8px',
              menuButton: '8px',
              modal: '12px',
              modalMobile: '12px',
            },
            shadows: {
              connectButton: '0px 4px 12px rgba(0, 0, 0, 0.1)',
              dialog: '0px 8px 32px rgba(0, 0, 0, 0.12)',
              profileDetailsAction: '0px 2px 6px rgba(37, 41, 46, 0.04)',
              selectedOption: '0px 2px 6px rgba(0, 0, 0, 0.12)',
              selectedWallet: '0px 2px 6px rgba(0, 0, 0, 0.12)',
              walletLogo: '0px 2px 8px rgba(0, 0, 0, 0.12)',
            },
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

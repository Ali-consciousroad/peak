"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, Copy, ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WalletModalProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export default function WalletModal({ onConnect, onDisconnect }: WalletModalProps) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isLoading: isConnecting, pendingConnector } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  // Debug: Log connectors once when they're available (only in development)
  const hasLoggedRef = useRef(false);
  useEffect(() => {
    if (!hasLoggedRef.current && typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && connectors?.length) {
      console.log('Wallet connectors initialized:', connectors.length, connectors.map(c => c.name));
      hasLoggedRef.current = true;
    }
  }, [connectors]);

  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const formattedAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const openExplorer = useCallback(() => {
    if (!address) return;
    // Avalanche C-Chain explorer
    window.open(`https://snowtrace.io/address/${address}`, '_blank');
  }, [address]);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  const startSiwe = useCallback(async () => {
    if (!address) return;
    try {
      setIsVerifying(true);
      // 1) Get nonce
      const nonceRes = await fetch('/api/siwe/nonce', { cache: 'no-store' });
      if (!nonceRes.ok) throw new Error('Failed to fetch nonce');
      const { nonce, domain } = await nonceRes.json();

      // 2) Build SIWE message
      const issuedAt = new Date().toISOString();
      const message = [
        `${domain} wants you to sign in with your Ethereum account:`,
        `${address}`,
        '',
        'Sign in to verify your wallet ownership and start using your account.',
        '',
        `URI: ${window.location.origin}`,
        `Version: 1`,
        `Chain ID: ${chainId ?? ''}`,
        `Nonce: ${nonce}`,
        `Issued At: ${issuedAt}`,
      ].join('\n');

      // 3) User signs
      const signature = await signMessageAsync({ message });

      // 4) Verify server-side
      const verifyRes = await fetch('/api/siwe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature, address, chainId }),
      });
      if (!verifyRes.ok) throw new Error('Signature verification failed');

      onConnect?.(address);
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifying(false);
    }
  }, [address, chainId, onConnect, signMessageAsync]);

  const handleDisconnect = useCallback(async () => {
    try {
      await fetch('/api/siwe/logout', { method: 'POST' });
    } catch {}
    // Disconnect wagmi
    disconnect();
    // Proactively clear cached connectors/session to avoid silent reconnection to the last wallet (e.g., Core)
    try {
      if (typeof window !== 'undefined') {
        const keysToClear = [
          'wagmi.store',
          'wagmi.connected',
          'walletconnect',
          'wc@2:core:pairing',
          'wc@2:core:history',
          'web3modal',
          'walletlink',
          'coinbaseWalletSDK',
          '@walletconnect/relayer',
        ];
        keysToClear.forEach((k) => window.localStorage.removeItem(k));
        keysToClear.forEach((k) => window.sessionStorage?.removeItem?.(k));
      }
    } catch {}
    onDisconnect?.();
  }, [disconnect, onDisconnect]);

  const selectInjectedProviderByName = (targetName: string) => {
    try {
      const win = window as any;
      const injected = win.ethereum;
      if (!injected) return;
      const providers = injected.providers || [];
      if (providers.length === 0) return;
      const normalized = targetName.toLowerCase();
      const match = providers.find((p: any) => {
        const name: string = (p?.providerConfig?.id || p?.isMetaMask && 'metamask' || p?.isCoinbaseWallet && 'coinbase' || p?.isBraveWallet && 'brave' || p?.isRabby && 'rabby' || p?.isPhantom && 'phantom' || p?.isAvalanche && 'core' || p?.name || '').toString().toLowerCase();
        return name.includes(normalized);
      });
      if (match) {
        // Some wallets support setting the selected provider
        if (typeof injected.setSelectedProvider === 'function') {
          injected.setSelectedProvider(match);
        } else {
          // Fallback: temporarily swap window.ethereum for connect call
          (win as any).__prevEthereum = injected;
          (win as any).ethereum = match;
          setTimeout(() => {
            (win as any).ethereum = (win as any).__prevEthereum || injected;
            delete (win as any).__prevEthereum;
          }, 2000);
        }
      }
    } catch {}
  };

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="rounded-full border border-gray-900 dark:border-white bg-transparent px-4 py-1.5 text-sm text-gray-900 dark:text-white transition-colors hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Wallet className="h-4 w-4 mr-2" />
            {formattedAddress}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-3 py-2 border-b">
            <p className="text-sm font-medium">Connected</p>
            <p className="text-xs text-gray-500">Avalanche C-Chain</p>
            <p className="text-xs text-gray-500">{address}</p>
          </div>
          <DropdownMenuItem onClick={copyAddress}>
            <Copy className="h-4 w-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Address'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openExplorer}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View on SnowTrace
          </DropdownMenuItem>
          <DropdownMenuItem onClick={startSiwe} disabled={isVerifying}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            {isVerifying ? 'Verifying...' : 'Sign to Verify'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect}>
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Not connected: show a connect button
  // The "Sign to Verify" button will appear automatically after wallet connects (handled by the connected state above)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="neon-btn px-5 py-2 font-semibold text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <Wallet className="h-4 w-4 mr-2" />
          {isConnecting && pendingConnector ? `Connecting ${pendingConnector.name}...` : 'Connect Wallet'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {connectors && connectors.length > 0 ? (
          connectors.map((c) => (
            <DropdownMenuItem
              key={c.uid || c.id || c.name}
              disabled={!c.ready || isConnecting}
              onSelect={(e) => {
                // Don't prevent default - let the dropdown close naturally
                if (!c.ready || isConnecting) {
                  e.preventDefault();
                  return;
                }
                console.log('Connecting to wallet:', c.name, c.ready);
                // If multiple injected providers exist, try to route to the selected brand before connecting
                if (typeof window !== 'undefined' && (c as any).type === 'injected') {
                  const name = c.name || '';
                  // Common names: MetaMask, Core, Phantom, Rabby, Coinbase
                  selectInjectedProviderByName(name);
                }
                // Use setTimeout to ensure dropdown closes before connecting
                setTimeout(() => {
                  try {
                    connect({ connector: c });
                  } catch (error) {
                    console.error('Error connecting wallet:', error);
                  }
                }, 100);
              }}
              className="cursor-pointer"
            >
              <Wallet className="h-4 w-4 mr-2" />
              {c.name || 'Unknown Wallet'}
              {!c.ready && <span className="ml-2 text-xs text-gray-400">(Not available)</span>}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>
            <Wallet className="h-4 w-4 mr-2" />
            No wallets available
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

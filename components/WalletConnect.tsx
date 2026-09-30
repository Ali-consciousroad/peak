"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '@/lib/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { useDisconnect } from 'wagmi';

export default function WalletConnect() {
  const { address, isConnected, chainId } = useWallet();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getExplorerUrl = () => {
    const chainIdNum = typeof chainId === 'number' ? chainId : (chainId ? parseInt(chainId, 16) : 1);
    switch (chainIdNum) {
      case 1: // Ethereum Mainnet
        return `https://etherscan.io/address/${address}`;
      case 137: // Polygon
        return `https://polygonscan.com/address/${address}`;
      case 10: // Optimism
        return `https://optimistic.etherscan.io/address/${address}`;
      case 42161: // Arbitrum
        return `https://arbiscan.io/address/${address}`;
      case 8453: // Base
        return `https://basescan.org/address/${address}`;
      case 43114: // Avalanche
        return `https://snowtrace.io/address/${address}`;
      default:
        return `https://etherscan.io/address/${address}`;
    }
  };

  const openExplorer = () => {
    if (address) {
      window.open(getExplorerUrl(), '_blank');
    }
  };

  const switchToAvalanche = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xa86a' }], // Avalanche mainnet
        });
      }
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum?.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xa86a',
                chainName: 'Avalanche Network',
                nativeCurrency: {
                  name: 'AVAX',
                  symbol: 'AVAX',
                  decimals: 18,
                },
                rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
                blockExplorerUrls: ['https://snowtrace.io/'],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding Avalanche network:', addError);
        }
      }
    }
  };

  if (!isConnected) {
    return (
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          // Note: If your app doesn't use authentication, you
          // can remove all 'authenticationStatus' checks
          const ready = mounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus ||
              authenticationStatus === 'authenticated');

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                'style': {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <Button 
                      onClick={openConnectModal} 
                      type="button"
                      className="neon-btn px-5 py-2 font-semibold text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect Wallet
                    </Button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <Button onClick={openChainModal} type="button" className="neon-btn px-5 py-2 font-semibold text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
                      Wrong network
                    </Button>
                  );
                }

                return (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                      onClick={openChainModal}
                      style={{ display: 'flex', alignItems: 'center' }}
                      type="button"
                      className="rounded-full border border-gray-900 dark:border-white bg-transparent px-4 py-1.5 text-sm text-gray-900 dark:text-white transition-colors hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            overflow: 'hidden',
                            marginRight: 4,
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              style={{ width: 12, height: 12 }}
                            />
                          )}
                        </div>
                      )}
                      {chain.name}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="rounded-full border border-gray-900 dark:border-white bg-transparent px-4 py-1.5 text-sm text-gray-900 dark:text-white transition-colors hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                        >
                          <Wallet className="h-4 w-4 mr-2" />
                          {formatAddress(account.address)}
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <div className="px-3 py-2 border-b">
                          <p className="text-sm font-medium">Connected Wallet</p>
                          <p className="text-xs text-gray-500">{account.displayName}</p>
                          <p className="text-xs text-gray-500">{account.address}</p>
                        </div>
                        <DropdownMenuItem onClick={copyAddress}>
                          <Copy className="h-4 w-4 mr-2" />
                          {copied ? 'Copied!' : 'Copy Address'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={openExplorer}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on Explorer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={switchToAvalanche}>
                          <span className="h-4 w-4 mr-2">🔺</span>
                          Switch to Avalanche
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => disconnect()}>
                          <LogOut className="h-4 w-4 mr-2" />
                          Disconnect
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    );
  }

  return null;
}

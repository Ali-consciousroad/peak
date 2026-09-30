'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Euro, Bitcoin, AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { validateCryptoWalletAddress } from '@/lib/crypto-conversion';
import { validateIban } from '@/lib/iban-validation';

interface PaymentPreferencesProps {
  userId: string;
  currentPreferences?: {
    preferredPaymentMethod: string;
    cryptoWalletAddress: string;
    bankAccount?: string | null;
  };
  onUpdate?: (preferences: any) => void;
}

export default function PaymentPreferences({ 
  userId, 
  currentPreferences, 
  onUpdate 
}: PaymentPreferencesProps) {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    preferredPaymentMethod: currentPreferences?.preferredPaymentMethod || 'EUR',
    cryptoWalletAddress: currentPreferences?.cryptoWalletAddress || '',
    bankAccount: currentPreferences?.bankAccount?.trim() || ''
  });

  useEffect(() => {
    setPreferences({
      preferredPaymentMethod: currentPreferences?.preferredPaymentMethod || 'EUR',
      cryptoWalletAddress: currentPreferences?.cryptoWalletAddress || '',
      bankAccount: currentPreferences?.bankAccount?.trim() || ''
    });
  }, [
    currentPreferences?.preferredPaymentMethod,
    currentPreferences?.cryptoWalletAddress,
    currentPreferences?.bankAccount
  ]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [walletValidation, setWalletValidation] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);
  const [ibanValidation, setIbanValidation] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  const supportedCryptos = ['BTC', 'ETH', 'AVAX', 'SOL'];

  const { address: connectedAddress, isConnected } = useAccount();

  const isEvmPayoutMethod = (m: string) => m === 'AVAX' || m === 'ETH';

  /** Prefer the injected wallet (Core, MetaMask, …) for AVAX/ETH C-chain addresses. */
  useEffect(() => {
    const m = preferences.preferredPaymentMethod;
    if (!isEvmPayoutMethod(m)) return;
    if (!isConnected || !connectedAddress) return;
    if (!validateCryptoWalletAddress(connectedAddress, m)) return;

    setPreferences((prev) => {
      if (prev.preferredPaymentMethod !== m) return prev;
      const cur = prev.cryptoWalletAddress.trim();
      if (cur === '') {
        return { ...prev, cryptoWalletAddress: connectedAddress };
      }
      if (cur.toLowerCase() === connectedAddress.toLowerCase()) {
        return prev;
      }
      if (!validateCryptoWalletAddress(cur, m)) {
        return { ...prev, cryptoWalletAddress: connectedAddress };
      }
      return prev;
    });
  }, [
    preferences.preferredPaymentMethod,
    isConnected,
    connectedAddress
  ]);

  const applyConnectedWalletAddress = useCallback(() => {
    const m = preferences.preferredPaymentMethod;
    if (!isEvmPayoutMethod(m) || !connectedAddress) return;
    if (!validateCryptoWalletAddress(connectedAddress, m)) return;
    setError(null);
    setPreferences((prev) => ({ ...prev, cryptoWalletAddress: connectedAddress }));
  }, [preferences.preferredPaymentMethod, connectedAddress]);

  useEffect(() => {
    if (preferences.cryptoWalletAddress && preferences.preferredPaymentMethod !== 'EUR') {
      const isValid = validateCryptoWalletAddress(
        preferences.cryptoWalletAddress, 
        preferences.preferredPaymentMethod
      );
      
      setWalletValidation({
        isValid,
        message: isValid 
          ? 'Valid wallet address' 
          : 'Invalid wallet address format'
      });
    } else {
      setWalletValidation(null);
    }
  }, [preferences.cryptoWalletAddress, preferences.preferredPaymentMethod]);

  useEffect(() => {
    const t = preferences.bankAccount.trim();
    if (!t) {
      setIbanValidation(null);
      return;
    }
    if (t.length < 8) {
      setIbanValidation(null);
      return;
    }
    const r = validateIban(t);
    if (r.ok) {
      setIbanValidation({ isValid: true, message: 'IBAN format and check digits are valid.' });
    } else {
      setIbanValidation({ isValid: false, message: r.message });
    }
  }, [preferences.bankAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    let normalizedBank: string | null = null;

    if (preferences.preferredPaymentMethod === 'EUR') {
      if (!preferences.bankAccount.trim()) {
        setError('Bank account (IBAN) is required when you choose Euro payouts');
        setLoading(false);
        return;
      }
      const iban = validateIban(preferences.bankAccount);
      if (!iban.ok) {
        setError(iban.message);
        setLoading(false);
        return;
      }
      normalizedBank = iban.electronic;
    } else if (preferences.bankAccount.trim()) {
      const iban = validateIban(preferences.bankAccount);
      if (!iban.ok) {
        setError(iban.message);
        setLoading(false);
        return;
      }
      normalizedBank = iban.electronic;
    }

    if (preferences.preferredPaymentMethod !== 'EUR' && !preferences.cryptoWalletAddress) {
      setError('Crypto wallet address is required for crypto payments');
      setLoading(false);
      return;
    }

    if (preferences.preferredPaymentMethod !== 'EUR' && walletValidation && !walletValidation.isValid) {
      setError('Invalid crypto wallet address format');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferredPaymentMethod: preferences.preferredPaymentMethod,
          cryptoWalletAddress: preferences.cryptoWalletAddress,
          bankAccount: normalizedBank
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Payment preferences updated successfully!');
        onUpdate?.({
          preferredPaymentMethod: preferences.preferredPaymentMethod,
          cryptoWalletAddress: preferences.cryptoWalletAddress,
          bankAccount: normalizedBank
        });
      } else {
        setError(data.error || 'Failed to update payment preferences');
      }
    } catch (err) {
      setError('Error updating payment preferences');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'EUR':
        return <Euro className="h-4 w-4" />;
      case 'BTC':
        return <Bitcoin className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold">Payment Preferences</h2>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">How do you want to get paid?</h3>
        <p className="text-blue-700 text-sm">
          Choose your preferred payment method. Crypto payments are automatically converted from EUR at current market rates.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Error</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Success</span>
          </div>
          <p className="text-green-600 text-sm mt-1">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="paymentMethod">Preferred Payment Method</Label>
          <Select
            value={preferences.preferredPaymentMethod}
            onValueChange={(value) => setPreferences(prev => ({ 
              ...prev, 
              preferredPaymentMethod: value,
              cryptoWalletAddress: value === 'EUR' ? '' : prev.cryptoWalletAddress
            }))}
          >
            <SelectTrigger id="paymentMethod" className="w-full">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">Euro (EUR) - Traditional Banking</SelectItem>
              <SelectItem value="BTC">Bitcoin (BTC) - Cryptocurrency</SelectItem>
              <SelectItem value="ETH">Ethereum (ETH) - Cryptocurrency</SelectItem>
              <SelectItem value="AVAX">Avalanche (AVAX) - Cryptocurrency</SelectItem>
              <SelectItem value="SOL">Solana (SOL) - Cryptocurrency</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {preferences.preferredPaymentMethod === 'EUR' && (
          <div>
            <Label htmlFor="bankAccount">Bank account (IBAN)</Label>
            <Input
              id="bankAccount"
              type="text"
              autoComplete="off"
              value={preferences.bankAccount}
              onChange={(e) => {
                setError(null);
                setPreferences((prev) => ({ ...prev, bankAccount: e.target.value }));
              }}
              placeholder="e.g. FR76 1234 5678 9012 3456 7890 123"
              className={`font-mono text-sm ${
                ibanValidation && !ibanValidation.isValid ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
              aria-invalid={ibanValidation && !ibanValidation.isValid ? true : undefined}
              aria-describedby={ibanValidation ? 'iban-hint-eur' : undefined}
            />
            {ibanValidation && (
              <div
                id="iban-hint-eur"
                role={ibanValidation.isValid ? undefined : 'alert'}
                className={`mt-2 text-sm flex items-center gap-2 ${
                  ibanValidation.isValid ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {ibanValidation.isValid ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{ibanValidation.message}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Used when the platform pays you in euros after a client releases escrow. We validate the IBAN format and check digits (this does not guarantee the account exists at your bank).
            </p>
          </div>
        )}

        {preferences.preferredPaymentMethod !== 'EUR' && (
          <div>
            <Label htmlFor="cryptoWalletAddress">
              {preferences.preferredPaymentMethod} Wallet Address
            </Label>
            {isEvmPayoutMethod(preferences.preferredPaymentMethod) && (
              <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/40 px-3 py-3 space-y-2">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {preferences.preferredPaymentMethod === 'AVAX'
                    ? 'Connect Core (or another wallet) on Avalanche C-Chain — your 0x address is filled in automatically when it’s empty or invalid.'
                    : 'Connect your wallet — your Ethereum 0x address is filled in automatically when it’s empty or invalid.'}
                </p>
                <ConnectButton.Custom>
                  {({
                    account,
                    chain,
                    openAccountModal,
                    openChainModal,
                    openConnectModal,
                    authenticationStatus,
                    mounted
                  }) => {
                    const ready = mounted && authenticationStatus !== 'loading';
                    const connected =
                      ready &&
                      account &&
                      chain &&
                      (!authenticationStatus ||
                        authenticationStatus === 'authenticated');
                    if (!ready) {
                      return (
                        <span className="text-xs text-gray-500">Loading wallet…</span>
                      );
                    }
                    if (!connected) {
                      return (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-blue-300 bg-white dark:bg-gray-900"
                          onClick={openConnectModal}
                        >
                          Connect wallet
                        </Button>
                      );
                    }
                    if (chain.unsupported) {
                      return (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-amber-800 dark:text-amber-200">
                            Wallet is on a network this app doesn’t use for connect. Switch to
                            Avalanche C-Chain (e.g. in Core) so we can read your 0x address.
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={openChainModal}
                          >
                            Switch network
                          </Button>
                        </div>
                      );
                    }
                    const addr = account.address;
                    const matches =
                      preferences.cryptoWalletAddress.trim() !== '' &&
                      preferences.cryptoWalletAddress.trim().toLowerCase() ===
                        addr.toLowerCase();
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                          {addr.slice(0, 6)}…{addr.slice(-4)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={openAccountModal}
                        >
                          Wallet
                        </Button>
                        {!matches && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={applyConnectedWalletAddress}
                          >
                            Use connected address
                          </Button>
                        )}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            )}
            {preferences.preferredPaymentMethod === 'SOL' && (
              <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                ⚠️ SOL payments require Solana blockchain integration. Please use AVAX, BTC, or ETH for now, or contact support for SOL payment setup.
              </div>
            )}
            <Input
              id="cryptoWalletAddress"
              type="text"
              value={preferences.cryptoWalletAddress}
              onChange={(e) => {
                setError(null);
                setPreferences((prev) => ({
                  ...prev,
                  cryptoWalletAddress: e.target.value
                }));
              }}
              placeholder={
                preferences.preferredPaymentMethod === 'SOL' 
                  ? 'Enter your Solana wallet address (base58 format)'
                  : preferences.preferredPaymentMethod === 'AVAX'
                  ? 'Enter your Avalanche C-Chain address (0x...) - works with Core Wallet, MetaMask'
                  : `Enter your ${preferences.preferredPaymentMethod} wallet address`
              }
              className={walletValidation ? (walletValidation.isValid ? 'border-green-500' : 'border-red-500') : ''}
              disabled={preferences.preferredPaymentMethod === 'SOL'}
            />
            {walletValidation && (
              <div className={`mt-2 text-sm flex items-center gap-2 ${
                walletValidation.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {walletValidation.isValid ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {walletValidation.message}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {preferences.preferredPaymentMethod === 'AVAX' 
                ? 'Use your Avalanche C-Chain address (starts with 0x). Works with Core Wallet, MetaMask, and other EVM-compatible wallets.'
                : preferences.preferredPaymentMethod === 'SOL'
                ? 'Solana addresses are base58 encoded (32-44 characters). SOL payments coming soon.'
                : 'This is where your crypto payments will be sent. Make sure the address is correct.'}
            </p>
          </div>
        )}

        {preferences.preferredPaymentMethod !== 'EUR' && (
          <div>
            <Label htmlFor="bankAccountOptional">Bank account (optional)</Label>
            <Input
              id="bankAccountOptional"
              type="text"
              autoComplete="off"
              value={preferences.bankAccount}
              onChange={(e) => {
                setError(null);
                setPreferences((prev) => ({ ...prev, bankAccount: e.target.value }));
              }}
              placeholder="IBAN if you also accept EUR payouts"
              className={`font-mono text-sm ${
                ibanValidation && !ibanValidation.isValid ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
              aria-invalid={ibanValidation && !ibanValidation.isValid ? true : undefined}
              aria-describedby={ibanValidation ? 'iban-hint-opt' : undefined}
            />
            {ibanValidation && (
              <div
                id="iban-hint-opt"
                role={ibanValidation.isValid ? undefined : 'alert'}
                className={`mt-2 text-sm flex items-center gap-2 ${
                  ibanValidation.isValid ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {ibanValidation.isValid ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{ibanValidation.message}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Optional backup for euro transfers if crypto cannot be used. If you enter an IBAN, it must be valid.
            </p>
          </div>
        )}

        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={
              loading ||
              (preferences.preferredPaymentMethod === 'EUR' && !preferences.bankAccount.trim()) ||
              (preferences.preferredPaymentMethod === 'EUR' &&
                ibanValidation &&
                !ibanValidation.isValid) ||
              (preferences.preferredPaymentMethod !== 'EUR' &&
                preferences.bankAccount.trim() &&
                ibanValidation &&
                !ibanValidation.isValid) ||
              (preferences.preferredPaymentMethod !== 'EUR' &&
                preferences.cryptoWalletAddress &&
                walletValidation &&
                !walletValidation.isValid)
            }
          >
            {loading ? 'Updating...' : 'Update Payment Preferences'}
          </Button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-800 mb-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Important Notes</span>
        </div>
        <ul className="text-yellow-700 text-sm space-y-1">
          <li>• Crypto payments are automatically converted from EUR at current market rates</li>
          <li>• Conversion rates are locked when the payment is released</li>
          <li>• You can change your payment preferences at any time</li>
          <li>• Make sure your wallet address is correct - payments cannot be reversed</li>
          <li>• <strong>BTC, ETH, AVAX:</strong> Payments sent on Avalanche C-Chain (works with Core Wallet, MetaMask)</li>
          <li>• <strong>SOL:</strong> Requires Solana blockchain integration (coming soon - use AVAX, BTC, or ETH for now)</li>
        </ul>
      </div>
    </Card>
  );
}

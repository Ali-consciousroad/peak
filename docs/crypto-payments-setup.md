# Crypto Payments Setup Guide

This guide explains how to set up real crypto payments on Avalanche C-Chain.

## Overview

The platform now supports **real blockchain transactions** for crypto payments:
- ✅ **AVAX** (Avalanche native token)
- ✅ **WBTC.e** (Wrapped Bitcoin on Avalanche)
- ✅ **WETH.e** (Wrapped Ethereum on Avalanche)

When builders request crypto payments, the platform will:
1. Convert EUR → crypto using real-time CoinGecko rates
2. Send crypto directly from platform wallet to builder's wallet
3. Record real transaction hash on Avalanche C-Chain

---

## Prerequisites

1. **Avalanche C-Chain wallet** with crypto reserves
2. **Private key** for the platform wallet (keep secure!)
3. **Crypto reserves** (AVAX, WBTC.e, WETH.e) in the platform wallet

---

## Environment Variables

Add these to your `.env` file:

```bash
# Platform Wallet Private Key (REQUIRED for real transactions)
# Format: 0x followed by 64 hex characters
# Example: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
PLATFORM_WALLET_PRIVATE_KEY=0x...

# Avalanche RPC URL (optional, defaults to public RPC)
# For production, consider using a private RPC provider (Infura, Alchemy, etc.)
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc

# CoinGecko API Key (optional, but recommended for higher rate limits)
COINGECKO_API_KEY=your_api_key_here
```

### Getting a Private Key

**⚠️ SECURITY WARNING:**
- Never commit private keys to git
- Use environment variables only
- Consider using a hardware wallet or multi-sig for production
- Rotate keys periodically

**Option 1: Generate New Wallet**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add 0x prefix: 0x<output>
```

**Option 2: Export from MetaMask**
1. Open MetaMask
2. Account Details → Export Private Key
3. Copy the private key (starts with 0x)

**Option 3: Use Hardware Wallet**
- For production, consider using a hardware wallet
- You'll need to use a different approach (not direct private key)

---

## Setting Up Platform Wallet

### Step 1: Create/Import Wallet

Create a new wallet or import an existing one. This will be your **platform wallet** that holds crypto reserves.

### Step 2: Fund the Wallet

Send crypto to your platform wallet address:

**For AVAX:**
- Send AVAX directly to the wallet address
- Keep some AVAX for gas fees (recommended: 1-2 AVAX minimum)

**For WBTC.e:**
- Bridge BTC to Avalanche C-Chain (via Avalanche Bridge)
- Or buy WBTC.e on a DEX (TraderJoe, Pangolin)
- Send WBTC.e to platform wallet

**For WETH.e:**
- Bridge ETH to Avalanche C-Chain (via Avalanche Bridge)
- Or buy WETH.e on a DEX
- Send WETH.e to platform wallet

### Step 3: Get Wallet Address

After setting up, you can check your wallet address:

```typescript
import { getPlatformWalletAddress } from '@/lib/platform-wallet';

const address = await getPlatformWalletAddress();
console.log('Platform wallet address:', address);
```

### Step 4: Check Balance

```typescript
import { getPlatformBalance, getPlatformWalletInfo } from '@/lib/platform-wallet';

const info = await getPlatformWalletInfo();
console.log('Balance:', info.balance);
```

---

## Testing

### Testnet Setup (Recommended First)

1. **Get testnet AVAX:**
   - Visit: https://faucet.avax.network/
   - Request testnet AVAX to your wallet

2. **Update RPC URL:**
   ```bash
   AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
   ```

3. **Use testnet private key:**
   - Create a test wallet (don't use mainnet private key!)
   - Set `PLATFORM_WALLET_PRIVATE_KEY` to test wallet private key

4. **Test a payment:**
   - Create a test mission
   - Set builder's preferred payment to AVAX
   - Release payment
   - Check transaction on [Snowtrace Testnet](https://testnet.snowtrace.io/)

### Mainnet Setup

1. **Fund platform wallet** with real crypto
2. **Set mainnet RPC URL** (or use default)
3. **Set mainnet private key** in environment variables
4. **Test with small amount first**

---

## Token Contracts on Avalanche C-Chain

- **WBTC.e**: `0x50b7545627a5162F82A992c33b87aDc75187B218`
- **WETH.e**: `0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB`
- **AVAX**: Native token (no contract)

---

## How It Works

### Payment Flow

1. **Client makes payment** (EUR, held in escrow)
2. **Admin verifies payment** (status: `MADE`)
3. **Client releases payment** (or mission completed)
4. **System checks builder's preference:**
   - If EUR → Release in EUR
   - If crypto → Continue to step 5
5. **Convert EUR → crypto** (using CoinGecko rates)
6. **Check platform balance** (ensure sufficient funds)
7. **Send crypto transaction** (via viem to Avalanche C-Chain)
8. **Wait for confirmation** (1 block confirmation)
9. **Record transaction hash** in database
10. **Update payment status** to `RELEASED`

### Currency Mapping

- **BTC** → **WBTC.e** (Wrapped BTC on Avalanche)
- **ETH** → **WETH.e** (Wrapped ETH on Avalanche)
- **AVAX** → **AVAX** (native token)

Builders can still select "BTC" or "ETH" in the UI, but the system automatically uses wrapped versions on Avalanche.

---

## Onchain Transaction Triggers

These are the parts of the project that trigger real blockchain transactions on **Avalanche C-Chain** when `PLATFORM_WALLET_PRIVATE_KEY` is set:

### Direct Onchain Transactions (Server-Side)

| Location | Trigger | What Happens |
|----------|---------|--------------|
| **`lib/crypto-transactions.ts`** | Core service | `sendTransaction()` (AVAX) or `writeContract()` (ERC-20 transfer for WBTC.e, WETH.e) |
| **`app/api/payments/[id]/release/route.ts`** | Client releases full payment | Sends crypto to builder if `preferredPaymentMethod` is AVAX/BTC/ETH/SOL |
| **`app/api/payments/[id]/release-milestone/route.ts`** | Client releases milestone (25%, 50%, 25%) | Same as above for milestone amounts |
| **`app/api/missions/[id]/complete/route.ts`** | Mission marked complete | Sends remaining crypto to builder |
| **`app/api/conflicts/[id]/resolve/route.ts`** | Conflict resolution (FULL_RELEASE, PARTIAL_REFUND release part) | Sends release amount to freelancer when payment method is crypto |

### Supporting Components

| Component | Role |
|-----------|------|
| **`lib/platform-wallet.ts`** | Creates wallet client from `PLATFORM_WALLET_PRIVATE_KEY`; used by crypto-transactions |
| **`lib/crypto-transactions.ts`** | `sendAvax()` (native transfer), `sendERC20Token()` (WBTC/WETH via contract), `sendCryptoPayment()` (dispatcher) |
| **`components/WalletModal.tsx`** | Wallet connect + SIWE via `useSignMessage` — signs messages only, does not send transactions |
| **`components/providers/Web3Provider.tsx`** | Wagmi/RainbowKit config — configuration only, no transactions |

### Not Onchain

- **SIWE** — Message signing only (no transaction broadcast)
- **Bank transfer / EUR** — Offchain, no blockchain involvement
- **Creating payments** — Database records only
- **Wallet connection** — Reads address and balance; no transactions sent

### Summary

Onchain transactions are sent by the **backend** when:
1. A client releases a payment (full or milestone) and the builder prefers crypto, or
2. A mission is completed and the builder prefers crypto, or
3. A conflict is resolved with a crypto release amount.

All are executed from the platform wallet via `lib/crypto-transactions.ts`. Without `PLATFORM_WALLET_PRIVATE_KEY`, these flows either fall back to simulated hashes or error.

---

## Monitoring & Maintenance

### Check Platform Balance

```typescript
import { checkPlatformBalance } from '@/lib/crypto-transactions';

const balance = await checkPlatformBalance(100, 'AVAX');
console.log('Sufficient:', balance.sufficient);
console.log('Balance:', balance.balance);
console.log('Required:', balance.required);
```

### View Transaction Status

```typescript
import { getTransactionStatus } from '@/lib/crypto-transactions';

const status = await getTransactionStatus('0x...');
console.log('Status:', status.status);
console.log('Block:', status.blockNumber);
```

### View Platform Wallet Info

```typescript
import { getPlatformWalletInfo } from '@/lib/platform-wallet';

const info = await getPlatformWalletInfo();
console.log('Address:', info.address);
console.log('Balance:', info.balance);
```

---

## Error Handling

The system handles various error scenarios:

1. **Insufficient Balance:**
   - Error: "Insufficient platform balance"
   - Solution: Top up platform wallet

2. **Invalid Address:**
   - Error: "Invalid wallet address"
   - Solution: Builder must provide valid Avalanche C-Chain address

3. **Network Issues:**
   - Error: "Failed to send crypto payment"
   - Solution: Check RPC URL, network connectivity

4. **Gas Issues:**
   - Error: "Insufficient AVAX for gas"
   - Solution: Ensure platform wallet has AVAX for gas fees

---

## Security Best Practices

1. **Private Key Security:**
   - ✅ Store in environment variables only
   - ✅ Never commit to git
   - ✅ Use secrets management (Vercel, AWS Secrets Manager, etc.)
   - ✅ Rotate keys periodically

2. **Wallet Management:**
   - ✅ Use multi-signature wallet for large amounts
   - ✅ Set up balance alerts
   - ✅ Monitor transactions regularly
   - ✅ Keep minimum reserves + buffer

3. **Access Control:**
   - ✅ Limit who can access platform wallet
   - ✅ Use separate wallets for testnet/mainnet
   - ✅ Implement transaction limits

4. **Monitoring:**
   - ✅ Set up transaction monitoring
   - ✅ Alert on failed transactions
   - ✅ Track balance trends
   - ✅ Log all transactions

---

## Troubleshooting

### "Platform wallet not configured"

**Problem:** `PLATFORM_WALLET_PRIVATE_KEY` not set or invalid.

**Solution:**
1. Check `.env` file has `PLATFORM_WALLET_PRIVATE_KEY`
2. Ensure private key starts with `0x` and is 66 characters total
3. Restart server after adding environment variable

### "Insufficient balance"

**Problem:** Platform wallet doesn't have enough crypto.

**Solution:**
1. Check balance: `getPlatformWalletInfo()`
2. Top up wallet with required crypto
3. For AVAX: Also ensure enough for gas fees

### "Transaction failed"

**Problem:** Transaction reverted on blockchain.

**Solution:**
1. Check transaction on [Snowtrace](https://snowtrace.io/)
2. Verify recipient address is valid
3. Check gas price (may be too low)
4. Ensure sufficient balance for amount + gas

### "Invalid wallet address"

**Problem:** Builder's wallet address is invalid.

**Solution:**
1. Builder must provide valid Avalanche C-Chain address (0x... format)
2. Address must be 42 characters (0x + 40 hex chars)
3. Validate address before saving

---

## Cost Estimates

- **Gas per transaction:** ~$0.01 (AVAX)
- **Monthly (1000 payments):** ~$10 in gas fees
- **Setup cost:** Minimal (just wallet setup)

---

## Next Steps

1. ✅ Set up platform wallet
2. ✅ Add environment variables
3. ✅ Fund wallet with crypto
4. ✅ Test on testnet first
5. ✅ Deploy to mainnet
6. ✅ Monitor transactions
7. ✅ Set up alerts

---

## Support

For issues or questions:
1. Check transaction on [Snowtrace](https://snowtrace.io/)
2. Review error logs
3. Check platform wallet balance
4. Verify environment variables

---

## API Reference

### `sendCryptoPayment(toAddress, amount, currency)`

Send crypto payment to builder.

**Parameters:**
- `toAddress`: Builder's wallet address (string)
- `amount`: Amount in crypto (number)
- `currency`: 'AVAX' | 'WBTC' | 'WETH'

**Returns:** `TransactionResult` with hash and confirmation status

### `checkPlatformBalance(amount, currency)`

Check if platform has sufficient balance.

**Returns:** Balance check result with sufficient flag and message

### `getPlatformWalletInfo()`

Get platform wallet information.

**Returns:** Wallet address, balance, and configuration status

---

## Related Documentation

- [Payment Workflow](./payment-workflow.md)
- [Payment Implementation Options](./payment-implementation-options.md)
- [Avalanche C-Chain Docs](https://docs.avax.network/learn/platform-overview/avalanche-consensus)


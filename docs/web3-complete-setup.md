# Complete Web3 Setup Guide

This is the **complete guide** for setting up all Web3 functionality in the marketplace, including wallet connections, SIWE verification, and crypto payments.

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Variables](#environment-variables)
3. [Wallet Connection Setup](#wallet-connection-setup)
4. [SIWE (Sign-In With Ethereum) Setup](#siwe-sign-in-with-ethereum-setup)
5. [Platform Wallet Setup (Crypto Payments)](#platform-wallet-setup-crypto-payments)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The marketplace has **three main Web3 components**:

1. **Wallet Connection** - Users connect wallets (MetaMask, Core, etc.)
2. **SIWE Verification** - Cryptographic wallet ownership verification for sensitive operations
3. **Crypto Payments** - Platform sends crypto to builders on Avalanche C-Chain

---

## Environment Variables

### Complete `.env` File

Add all these to your `.env.local` or `.env` file:

```bash
# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgres://..."

# ============================================
# CLERK AUTHENTICATION
# ============================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# ============================================
# WALLET CONNECTION (RainbowKit/WalletConnect)
# ============================================
# Get your project ID from: https://cloud.walletconnect.com
# Required for WalletConnect functionality
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# ============================================
# PLATFORM WALLET (Crypto Payments)
# ============================================
# REQUIRED for real crypto payments
# Format: 0x followed by 64 hex characters
PLATFORM_WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Optional: Custom Avalanche RPC URL
# Default: https://api.avax.network/ext/bc/C/rpc
# For production, use a private RPC (Infura, Alchemy, etc.)
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc

# ============================================
# EXCHANGE RATES (CoinGecko)
# ============================================
# Optional: For higher rate limits
# Get API key from: https://www.coingecko.com/en/api
COINGECKO_API_KEY=your_api_key_here
```

### Getting Required Keys

#### 1. WalletConnect Project ID
1. Visit: https://cloud.walletconnect.com
2. Sign up / Log in
3. Create a new project
4. Copy the Project ID
5. Add to `.env` as `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

#### 2. Platform Wallet Private Key
**⚠️ SECURITY: Never commit this to git!**

**Option A: Generate New Wallet**
```bash
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

**Option B: Export from MetaMask**
1. Open MetaMask
2. Account Details → Export Private Key
3. Copy (starts with `0x`)

**Option C: Use Test Wallet for Development**
- Create a test wallet on Avalanche testnet
- Use testnet private key (separate from mainnet!)

#### 3. CoinGecko API Key (Optional)
1. Visit: https://www.coingecko.com/en/api
2. Sign up for free tier
3. Get API key
4. Add to `.env` as `COINGECKO_API_KEY`

---

## Wallet Connection Setup

### What It Does

Allows users to connect their wallets to the platform:
- **Builders**: Connect wallet to receive crypto payments
- **Clients**: Connect wallet for SIWE verification

### Supported Wallets

- ✅ MetaMask
- ✅ Core Wallet (Avalanche)
- ✅ Phantom (EVM mode)
- ✅ Coinbase Wallet
- ✅ WalletConnect (mobile wallets)
- ✅ Any EIP-6963 compatible wallet

### Setup Steps

1. **Get WalletConnect Project ID** (see above)
2. **Add to `.env`**:
   ```bash
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   ```
3. **Restart dev server**:
   ```bash
   npm run dev
   ```

### How It Works

- Users click "Connect Wallet" button
- RainbowKit modal shows available wallets
- User selects wallet and approves connection
- Wallet address is stored in session
- Works on Avalanche C-Chain (chain ID: 43114)

### Testing

1. Open app in browser
2. Click "Connect Wallet" (in navbar or wallet modal)
3. Select a wallet (MetaMask, etc.)
4. Approve connection
5. Wallet address should appear

---

## SIWE (Sign-In With Ethereum) Setup

### What It Does

**SIWE** = Sign-In With Ethereum

Cryptographic verification that proves wallet ownership. Required for:
- Creating contracts
- Making payments
- Other sensitive operations

### How It Works

1. User connects wallet (see above)
2. User clicks "Sign to Verify" (or triggered automatically)
3. System generates a nonce (one-time code)
4. User signs a message with their wallet
5. System verifies the signature
6. Session cookie created (valid for 1 hour)

### Setup

**No additional setup needed!** SIWE works automatically once:
- ✅ Wallet connection is set up
- ✅ `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is configured

### Protected Routes

SIWE is automatically required for:
- `POST /api/contracts` - Creating contracts
- `POST /api/payments` - Making payments
- `POST /api/payments/[id]/release` - Releasing payments
- Other mutation endpoints (POST, PUT, DELETE)

### User Flow

1. User tries to perform sensitive action
2. If no SIWE session → Error: "Wallet verification required"
3. User connects wallet (if not already)
4. User signs message
5. Action proceeds

### Testing

1. Connect wallet
2. Try to create a contract or make payment
3. If SIWE required → Sign message
4. Action should proceed

---

## Platform Wallet Setup (Crypto Payments)

### What It Does

Platform wallet sends crypto payments to builders on Avalanche C-Chain.

### Prerequisites

1. **Private key** (see environment variables above)
2. **Funded wallet** with crypto reserves:
   - AVAX (for gas + payments)
   - WBTC.e (if builders want BTC)
   - WETH.e (if builders want ETH)

### Setup Steps

#### Step 1: Get Platform Wallet Address

After setting `PLATFORM_WALLET_PRIVATE_KEY`, you can get the address:

```typescript
// In a script or API route
import { getPlatformWalletAddress } from '@/lib/platform-wallet';

const address = await getPlatformWalletAddress();
console.log('Platform wallet:', address);
```

Or check the server logs when starting the app (if configured).

#### Step 2: Fund the Wallet

**For AVAX:**
- Send AVAX to platform wallet address
- Keep 1-2 AVAX minimum for gas fees
- Get testnet AVAX: https://faucet.avax.network/

**For WBTC.e:**
- Bridge BTC to Avalanche C-Chain (via Avalanche Bridge)
- Or buy WBTC.e on TraderJoe/Pangolin
- Send WBTC.e to platform wallet

**For WETH.e:**
- Bridge ETH to Avalanche C-Chain
- Or buy WETH.e on DEX
- Send WETH.e to platform wallet

#### Step 3: Verify Setup

Check if platform wallet is configured:

```typescript
import { isPlatformWalletConfigured, getPlatformWalletInfo } from '@/lib/platform-wallet';

if (isPlatformWalletConfigured()) {
  const info = await getPlatformWalletInfo();
  console.log('Address:', info.address);
  console.log('Balance:', info.balance);
} else {
  console.log('Platform wallet not configured');
}
```

### How It Works

1. Builder sets payment preference (BTC, ETH, or AVAX)
2. Builder provides wallet address
3. Client releases payment
4. System converts EUR → crypto (CoinGecko rates)
5. System checks platform wallet balance
6. System sends crypto transaction on Avalanche C-Chain
7. Transaction hash recorded in database

### Currency Mapping

- **BTC** → **WBTC.e** (Wrapped BTC on Avalanche)
- **ETH** → **WETH.e** (Wrapped ETH on Avalanche)
- **AVAX** → **AVAX** (native token)

### Token Contracts

- **WBTC.e**: `0x50b7545627a5162F82A992c33b87aDc75187B218`
- **WETH.e**: `0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB`

---

## Testing

### Testnet Setup (Recommended First)

1. **Use testnet RPC**:
   ```bash
   AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
   ```

2. **Create test wallet**:
   - Generate new wallet (don't use mainnet key!)
   - Get testnet AVAX: https://faucet.avax.network/
   - Set `PLATFORM_WALLET_PRIVATE_KEY` to test wallet key

3. **Test wallet connection**:
   - Connect MetaMask
   - Switch to Avalanche Fuji Testnet (chain ID: 43113)
   - Connect wallet in app

4. **Test SIWE**:
   - Connect wallet
   - Try to create contract
   - Sign message
   - Verify it works

5. **Test crypto payment**:
   - Create test mission
   - Set builder preference to AVAX
   - Fund platform wallet with testnet AVAX
   - Release payment
   - Check transaction on [Snowtrace Testnet](https://testnet.snowtrace.io/)

### Mainnet Setup

1. **Fund platform wallet** with real crypto
2. **Use mainnet RPC** (or default)
3. **Set mainnet private key**
4. **Test with small amount first**

---

## Troubleshooting

### Wallet Connection Issues

**Problem:** "No wallets found" or wallets not showing

**Solutions:**
1. Check `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set
2. Restart dev server after adding env var
3. Clear browser cache
4. Try different wallet (MetaMask, Core, etc.)

**Problem:** Wallet connects but disconnects immediately

**Solutions:**
1. Check browser console for errors
2. Ensure wallet is on Avalanche network
3. Try refreshing page

### SIWE Issues

**Problem:** "Wallet verification required" error

**Solutions:**
1. Connect wallet first
2. Click "Sign to Verify" button
3. Approve message in wallet
4. Check SIWE session cookie is set

**Problem:** "Wallet session expired"

**Solutions:**
1. SIWE sessions expire after 1 hour
2. Re-sign message to refresh session
3. For mutations, recent signature required (within 5 minutes)

### Crypto Payment Issues

**Problem:** "Platform wallet not configured"

**Solutions:**
1. Check `PLATFORM_WALLET_PRIVATE_KEY` is set
2. Ensure private key starts with `0x` and is 66 characters
3. Restart server after adding env var

**Problem:** "Insufficient balance"

**Solutions:**
1. Check platform wallet balance
2. Ensure enough AVAX for gas fees
3. Top up wallet with required crypto

**Problem:** "Transaction failed"

**Solutions:**
1. Check transaction on [Snowtrace](https://snowtrace.io/)
2. Verify recipient address is valid
3. Check gas price (may be too low)
4. Ensure sufficient balance

### RPC Issues

**Problem:** Slow or failed RPC calls

**Solutions:**
1. Use private RPC provider (Infura, Alchemy)
2. Update `AVALANCHE_RPC_URL` in `.env`
3. For production, use paid RPC for reliability

---

## Complete Setup Checklist

### Development Setup

- [ ] Clone repository
- [ ] Install dependencies (`npm install`)
- [ ] Set up database (Prisma)
- [ ] Configure Clerk authentication
- [ ] Get WalletConnect Project ID
- [ ] Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` to `.env`
- [ ] Test wallet connection
- [ ] Test SIWE verification
- [ ] (Optional) Set up platform wallet for crypto payments
- [ ] (Optional) Test crypto payments on testnet

### Production Setup

- [ ] All development steps completed
- [ ] Platform wallet created and secured
- [ ] Platform wallet funded with crypto
- [ ] Private RPC provider configured (recommended)
- [ ] CoinGecko API key added (for higher limits)
- [ ] Tested on testnet first
- [ ] Tested with small amounts on mainnet
- [ ] Monitoring and alerts set up
- [ ] Security review completed

---

## Related Documentation

- [Crypto Payments Setup](./crypto-payments-setup.md) - Detailed crypto payment guide
- [Payment Workflow](./payment-workflow.md) - Payment system overview
- [Payment Implementation Options](./payment-implementation-options.md) - Technical options
- [Implementation Summary](../../IMPLEMENTATION_SUMMARY.md) - What was built

---

## Support

For issues:
1. Check this guide first
2. Review error messages in console/logs
3. Check transaction on [Snowtrace](https://snowtrace.io/)
4. Verify environment variables are set
5. Check platform wallet balance

---

## Quick Reference

### Environment Variables Summary

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ Yes | Wallet connection |
| `PLATFORM_WALLET_PRIVATE_KEY` | ⚠️ For payments | Crypto payments |
| `AVALANCHE_RPC_URL` | ❌ Optional | Custom RPC |
| `COINGECKO_API_KEY` | ❌ Optional | Rate limits |

### Key Endpoints

- `/api/siwe/nonce` - Get SIWE nonce
- `/api/siwe/verify` - Verify SIWE signature
- `/api/siwe/logout` - Clear SIWE session
- `/api/payments/[id]/release` - Release payment (requires SIWE)

### Network Info

- **Chain**: Avalanche C-Chain
- **Chain ID**: 43114 (mainnet), 43113 (testnet)
- **Explorer**: https://snowtrace.io/
- **Testnet Explorer**: https://testnet.snowtrace.io/

---

**Last Updated:** After crypto payments implementation
**Status:** ✅ Complete and ready for use


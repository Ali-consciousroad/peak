# Payment Workflow & Crypto Conversion System

## Overview

This document explains how the payment system works in the freelance marketplace, including the escrow system, fiat-to-crypto conversion, and wallet integration.

**Important:** The system works **fully** even if no builders select crypto payments. EUR payments require no crypto setup.

## Architecture

### 1. Escrow System

**Flow:**
```
Client Payment (Fiat/EUR) → Platform Escrow → Admin Verification → Builder Receives (EUR or Crypto)
```

**EUR Payments (No Crypto Setup Required):**
- ✅ Works immediately - no platform wallet needed
- ✅ Traditional bank transfer
- ✅ No blockchain transactions
- ✅ Only requires: Database, Clerk auth, basic setup

**Crypto Payments (Requires Platform Wallet):**
- ⚠️ Requires: `PLATFORM_WALLET_PRIVATE_KEY` in environment
- ⚠️ Requires: Platform wallet funded with crypto
- ✅ Real blockchain transactions on Avalanche C-Chain

**Status Flow:**
- `PENDING` - Client has made payment, waiting for admin verification
- `MADE` - Admin verified, payment held in escrow (platform holds the money)
- `RELEASED` - Payment released to builder (converted to crypto if preferred)
- `COMPLETED` - Full payment completed
- `RELEASED_1`, `RELEASED_2` - Milestone releases (25%, 50%, etc.)

### 2. Supported Currencies

**Fiat (Clients pay in):**
- EUR (Euro) - Primary currency
- More currencies can be added (USD, GBP, etc.)

**Cryptocurrencies (Builders receive):**
- **BTC** (Bitcoin) - Cryptocurrency
- **ETH** (Ethereum) - Cryptocurrency
- **AVAX** (Avalanche) - Cryptocurrency
- **SOL** (Solana) - Cryptocurrency (requires Solana blockchain integration)

**Note:** No USD stablecoins (USDT, USDC) to avoid US jurisdiction concerns.

### 3. Conversion System

#### Real-Time Exchange Rates
- Uses **CoinGecko API** for real-time rates
- Rates cached for 5 minutes to reduce API calls
- Falls back to mock rates if API fails (development only)

#### Conversion Timing
- Conversion happens **at payment release time** (not at payment time)
- Rate is locked when client releases payment
- Builder sees preview of crypto amount before release

#### Conversion Process
1. Client releases payment
2. System checks builder's `preferredPaymentMethod`
3. **If EUR preferred:**
   - Payment released in EUR (traditional bank transfer)
   - No crypto conversion needed
   - No platform wallet required
4. **If crypto preferred:**
   - Fetch current exchange rate from CoinGecko
   - Calculate crypto amount: `EUR amount × exchange rate`
   - Show preview to client
   - Execute real blockchain transaction on Avalanche C-Chain
   - Send crypto to builder's wallet address (AVAX, WBTC.e, or WETH.e)
   - Record real transaction hash
   - Wait for blockchain confirmation

### 4. Wallet Integration

**Supported Wallets:**
- MetaMask
- Core Wallet
- Phantom (EVM mode)
- Coinbase Wallet
- WalletConnect
- Other EIP-6963 compatible wallets

**Wallet Usage:**
- **Builders**: Connect wallet to receive crypto payments (if crypto preferred)
- **Clients**: Connect wallet for SIWE (Sign-In With Ethereum) verification
- **Platform**: Platform wallet for executing crypto transactions (✅ implemented)

### 5. Crypto Payment Implementation

**Current Status:** ✅ **Fully Implemented**

**Implementation:**
- **Direct wallet transfers** on Avalanche C-Chain
- Platform holds crypto reserves (AVAX, WBTC.e, WETH.e)
- Real blockchain transactions using viem
- Transaction confirmation and monitoring
- Currency mapping:
  - **BTC** → **WBTC.e** (Wrapped BTC on Avalanche C-Chain)
  - **ETH** → **WETH.e** (Wrapped ETH on Avalanche C-Chain)
  - **AVAX** → **AVAX** (Native token, sent directly)
  - **SOL** → Requires Solana blockchain integration (not yet implemented)

**Future Enhancement (Phase 2):**
- **DEX Integration** - 1inch aggregator for better rates
- Platform holds USDC.e instead of multiple cryptos
- On-demand swaps when releasing payments

## User Workflows

### Builder Workflow

1. **Set Payment Preferences**
   - Go to profile → Payment Preferences (or click "Payment Preferences" button on dashboard)
   - Choose: EUR, BTC, ETH, AVAX, or SOL
   - Enter wallet address (validated automatically)
   - **For AVAX/BTC/ETH:** Use Avalanche C-Chain address (0x... format, works with Core Wallet, MetaMask)
   - **For SOL:** Base58 format (requires Solana integration - coming soon)
   - Save preferences

2. **Receive Payment**
   - Payment is held in escrow (fiat/EUR)
   - When client releases:
     - **If EUR preferred:** Payment released in EUR (traditional bank transfer)
     - **If crypto preferred:** 
       - System converts EUR → crypto at current rate (locked at release time)
       - Real blockchain transaction executed on Avalanche C-Chain
       - Crypto sent to builder's wallet:
         - **AVAX:** Sent as native AVAX (not wrapped)
         - **BTC:** Sent as WBTC.e (Wrapped BTC on Avalanche)
         - **ETH:** Sent as WETH.e (Wrapped ETH on Avalanche)
         - **SOL:** Requires Solana blockchain integration (not yet implemented)
       - Real transaction hash recorded and confirmed
       - Transaction visible on Avalanche blockchain explorer

### Client Workflow

1. **Make Payment**
   - Pay in EUR (fiat) via bank transfer
   - Payment goes to platform escrow
   - Status: `PENDING`

2. **Admin Verification**
   - Admin verifies payment received
   - Status: `MADE` (in escrow)

3. **Release Payment**
   - **If builder prefers EUR:**
     - Payment released in EUR (no conversion needed)
     - Traditional bank transfer
   - **If builder prefers crypto:**
     - Client can preview conversion
     - Shows: EUR amount → crypto amount with current rate
     - Client releases payment
     - System executes real blockchain transaction
     - Crypto sent to builder's wallet on Avalanche C-Chain
     - Transaction confirmed and hash recorded
   - Status: `RELEASED` or `COMPLETED`

## API Endpoints

### Payment Management
- `POST /api/payments` - Create payment (client)
- `POST /api/payments/[id]/verify` - Verify payment (admin)
- `GET /api/payments/[id]/conversion-preview` - Preview crypto conversion
- `POST /api/payments/[id]/release` - Release payment (client)
- `POST /api/payments/[id]/release-milestone` - Release milestone (client)

### Conversion
- `GET /api/crypto/convert` - Get conversion rate
- `POST /api/crypto/convert` - Convert amount

## Database Schema

### Payment Model
```prisma
model Payment {
  amount                Decimal    // EUR amount
  cryptoAmount          Decimal?   // Converted crypto amount
  cryptoCurrency        String?    // BTC, ETH, AVAX
  conversionRate        Decimal?   // Rate used for conversion
  cryptoTransactionHash String?    // Blockchain transaction hash
  cryptoWalletAddress   String?    // Builder's wallet address
  status                String     // PENDING, MADE, RELEASED, etc.
}
```

### User Model
```prisma
model User {
  preferredPaymentMethod String?   // EUR, BTC, ETH, AVAX
  cryptoWalletAddress    String?   // Wallet address for crypto payments
}
```

## Security Considerations

1. **Wallet Address Validation**
   - Format validation before saving
   - BTC: Legacy, Segwit, or Bech32 addresses
   - ETH/AVAX: Ethereum-style addresses (0x...)

2. **Rate Locking**
   - Rate locked at release time
   - Prevents rate manipulation

3. **Transaction Verification**
   - Transaction hashes recorded
   - Can be verified on blockchain explorer

4. **SIWE (Sign-In With Ethereum)**
   - Required for sensitive operations
   - Verifies wallet ownership

## Future Enhancements

### Phase 2: DEX Integration
- Integrate 1inch aggregator API
- Compare rates across DEXs
- Execute swaps programmatically
- Better rates for builders

### Phase 3: Smart Contract Escrow
- Deploy escrow contract on Avalanche
- Hold funds in smart contract
- Auto-release on conditions
- Reduced platform custody

### Phase 4: Multi-Currency Support
- Support more fiat currencies (USD, GBP, etc.)
- Fiat-to-fiat conversion
- Then fiat → crypto

## Environment Variables

```env
# Required for wallet connection
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
# Get from: https://cloud.walletconnect.com

# Required for crypto payments (if builders want crypto)
PLATFORM_WALLET_PRIVATE_KEY=0x...
# Format: 0x followed by 64 hex characters

# Optional: Custom Avalanche RPC URL
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc

# Optional: CoinGecko API key (for higher rate limits)
COINGECKO_API_KEY=your_api_key_here

# Optional: 1inch API key (for future DEX integration)
ONEINCH_API_KEY=your_api_key_here
```

**Note:** If no builders select crypto payments, only `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is needed (for SIWE verification).

## Testing

### Development
- Uses mock rates if CoinGecko API fails (fallback)
- Real blockchain transactions (if platform wallet configured)
- Test wallet addresses accepted
- Can test on Avalanche testnet

### Production
- Real CoinGecko API calls
- Real blockchain transactions on Avalanche C-Chain
- Strict wallet address validation
- Transaction monitoring and confirmation

## AVAX Payment Workflow (Detailed)

### How AVAX Payments Work

1. **Builder Configuration:**
   - Builder selects "Avalanche (AVAX) - Cryptocurrency" as preferred payment method
   - Enters Avalanche C-Chain wallet address (0x... format)
   - Address validated: Must be 42 characters, starting with `0x`, valid hex characters

2. **Payment Flow:**
   - Client pays in EUR (fiat) → Platform escrow
   - Admin verifies payment → Status: `MADE`
   - Client releases payment → System checks builder preference

3. **Conversion & Transfer:**
   - System fetches current EUR → AVAX rate from CoinGecko API
   - Calculates AVAX amount: `EUR amount × exchange rate`
   - Shows preview to client before release
   - **Platform wallet sends AVAX directly** to builder's wallet on Avalanche C-Chain
   - Transaction executed using viem library
   - Gas fees paid by platform (not deducted from payment)
   - Transaction hash recorded in database
   - Waits for blockchain confirmation

4. **What Builder Receives:**
   - **Native AVAX** (not wrapped) sent directly to wallet
   - Amount calculated at release time (rate locked)
   - Transaction hash for verification
   - Visible on Avalanche blockchain explorer: `https://snowtrace.io/tx/{hash}`

### Key Features

- ✅ **No wrapping needed** - AVAX sent as native token
- ✅ **Real blockchain transactions** - Fully on-chain, verifiable
- ✅ **Rate locked at release** - Builder gets exact amount shown in preview
- ✅ **Gas fees covered** - Platform pays transaction fees
- ✅ **Instant confirmation** - Transaction visible immediately on blockchain

### Supported Wallets for AVAX

- Core Wallet (recommended)
- MetaMask
- Coinbase Wallet
- WalletConnect compatible wallets
- Any EVM-compatible wallet

## Recent Updates (2024)

### Payment Method Changes
- ✅ **Added:** Avalanche (AVAX) and Solana (SOL) payment options
- ❌ **Removed:** USDT and USDC (to avoid US jurisdiction concerns)
- 🔄 **Updated:** All crypto options now labeled as "Cryptocurrency" (previously "Native Token")

### UI Improvements
- ✅ Payment Preferences button added to dashboard for quick access
- ✅ Automatic scroll to payment preferences when opened from dashboard
- ✅ Improved wallet address validation and user feedback
- ✅ Clear warnings for SOL (requires Solana integration)

## Support

For issues or questions:
1. Check wallet address format (AVAX: 0x... format, 42 characters)
2. Verify exchange rates are current (rates locked at release time)
3. Check transaction hashes on Avalanche blockchain explorer: https://snowtrace.io
4. Contact support if conversion fails or transaction doesn't appear
5. Ensure platform wallet has sufficient AVAX balance for payments



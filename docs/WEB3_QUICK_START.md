# Web3 Quick Start Guide

**Quick reference for getting Web3 features working.**

---

## Minimum Setup (Wallet Connection Only)

1. **Get WalletConnect Project ID:**
   - Visit: https://cloud.walletconnect.com
   - Create project → Copy Project ID

2. **Add to `.env`:**
   ```bash
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   ```

3. **Restart server:**
   ```bash
   npm run dev
   ```

4. **Test:**
   - Open app → Click "Connect Wallet"
   - Select wallet → Approve
   - ✅ Done!

---

## Full Setup (Wallet + Crypto Payments)

### Step 1: Wallet Connection (see above)

### Step 2: Platform Wallet

1. **Generate wallet private key:**
   ```bash
   node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Add to `.env`:**
   ```bash
   PLATFORM_WALLET_PRIVATE_KEY=0x...
   ```

3. **Fund wallet:**
   - Get wallet address (check server logs or use `getPlatformWalletAddress()`)
   - Send AVAX to wallet (testnet: https://faucet.avax.network/)
   - For BTC/ETH payments: Send WBTC.e/WETH.e

4. **Test:**
   - Create mission → Set builder preference to AVAX
   - Release payment → Check transaction on Snowtrace

---

## Environment Variables Checklist

```bash
# Required for wallet connection
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=✅

# Required for crypto payments
PLATFORM_WALLET_PRIVATE_KEY=✅

# Optional
AVALANCHE_RPC_URL=❌ (uses default)
COINGECKO_API_KEY=❌ (works without, but recommended)
```

---

## Testing Checklist

- [ ] Wallet connects successfully
- [ ] SIWE verification works (sign message)
- [ ] Platform wallet configured (if doing crypto payments)
- [ ] Test payment on testnet (if doing crypto payments)

---

## Need More Details?

- **Complete Guide:** [docs/web3-complete-setup.md](./web3-complete-setup.md)
- **Crypto Payments:** [docs/crypto-payments-setup.md](./crypto-payments-setup.md)
- **Payment Workflow:** [docs/payment-workflow.md](./payment-workflow.md)

---

## Common Issues

**Wallets not showing?**
→ Check `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set and restart server

**"Platform wallet not configured"?**
→ Add `PLATFORM_WALLET_PRIVATE_KEY` to `.env` and restart

**SIWE not working?**
→ Connect wallet first, then sign message

---

**That's it!** 🚀


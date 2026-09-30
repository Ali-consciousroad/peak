import { useAccount, useBalance, useNetwork } from 'wagmi';

export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount();
  const { chain } = useNetwork();
  const { data: balance } = useBalance({
    address,
  });

  return {
    address,
    isConnected,
    isConnecting,
    chainId: chain?.id,
    balance,
    formattedAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '',
  };
}

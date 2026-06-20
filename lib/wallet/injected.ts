"use client";

export interface InjectedWallet {
  address: `0x${string}`;
  chainId: number;
}

export async function connectInjectedWallet(): Promise<InjectedWallet> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet found. Please install MetaMask or a compatible wallet.");
  }
  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts returned from wallet.");
  }
  const chainIdHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
  return {
    address: accounts[0] as `0x${string}`,
    chainId: parseInt(chainIdHex, 16),
  };
}

export async function getConnectedAccounts(): Promise<`0x${string}`[]> {
  if (typeof window === "undefined" || !window.ethereum) return [];
  try {
    const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
    return accounts as `0x${string}`[];
  } catch {
    return [];
  }
}

export async function switchToStudionet(): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) return;
  const studionetChainId = process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || "0x4BFB7";
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: studionetChainId }],
    });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: studionetChainId,
          chainName: "GenLayer Studionet",
          rpcUrls: [process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api"],
          nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        }],
      });
    }
  }
}

export function getContractAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || "";
  if (!addr) {
    throw new Error(
      "Contract address not set. Add NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS to .env.local after deploying."
    );
  }
  return addr as `0x${string}`;
}

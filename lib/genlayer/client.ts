"use client";

import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet, localnet } from "genlayer-js/chains";
import type { GenLayerClient } from "genlayer-js/types";
import type { GenLayerChain } from "genlayer-js/types";

let _client: GenLayerClient<GenLayerChain> | null = null;

function rpc() {
  return process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "";
}

function pickChain() {
  const endpoint = rpc();
  if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1")) {
    return localnet;
  }
  return studionet;
}

export function getClient(): GenLayerClient<GenLayerChain> {
  if (!_client) {
    const endpoint = rpc();
    _client = createClient({
      chain: pickChain(),
      ...(endpoint ? { endpoint } : {}),
    });
  }
  return _client;
}

export function setClientAccount(privateKey: `0x${string}`) {
  const account = createAccount(privateKey);
  const endpoint = rpc();
  _client = createClient({
    chain: pickChain(),
    account,
    ...(endpoint ? { endpoint } : {}),
  });
  return account;
}

export function setClientFromAddress(address: `0x${string}`) {
  const endpoint = rpc();
  _client = createClient({
    chain: pickChain(),
    account: address,
    ...(endpoint ? { endpoint } : {}),
  });
  return address;
}

export function clearClient() {
  _client = null;
}

export { createAccount, generatePrivateKey };

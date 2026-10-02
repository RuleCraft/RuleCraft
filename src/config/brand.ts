// Single place to change project identity. Everything on the site reads from here.
// The token contract below is a placeholder until launch: paste the real
// 0x address (0x + 40 hex) into CA and the navbar pill, the footer block and
// every copy button switch from "Published at launch" to a working copy.

const CA = "0xxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

export const isAddress = (v: string): v is `0x${string}` => /^0x[0-9a-fA-F]{40}$/.test(v);

export const BRAND = {
  name: "Rule Craft",
  word: "Craft",
  ticker: "RULECRAFT",
  symbol: "$RULECRAFT",
  domain: "rulecraft.fun",
  url: "https://rulecraft.fun",
  slogan: "Craft your rules. Earn forever.",
  tagline: "Modular infrastructure for Uniswap v4 hooks.",
  description:
    "Rule Craft is a marketplace for Uniswap v4 hooks on Robinhood Chain. Compose pool rules from reusable modules, publish them as royalty-bearing blueprints, and let every trader read the rules before the first swap.",
  x: "https://x.com/rulecraft",
  xHandle: "@rulecraft",
  /** Public GitHub repository. Empty hides every GitHub link on the site. */
  github: "https://github.com/" as string,
  ca: CA,
} as const;

// Public endpoints are the default. An operator can point server reads at a
// private RPC with ROBINHOOD_RPC_URL (optional, server only).
const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";

export const CHAIN = {
  id: 4663,
  hex: "0x1237",
  name: "Robinhood Chain",
  nativeSymbol: "ETH",
  decimals: 18,
  publicRpc: PUBLIC_RPC,
  /** Second public endpoint, used for reads only when the first one fails. */
  fallbackRpc: "https://robinhood-rpc.publicnode.com",
  explorer: "https://robinhoodchain.blockscout.com",
  explorerName: "Blockscout",
} as const;

export const USDG = {
  symbol: "USDG",
  address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  decimals: 6,
} as const;

/**
 * Uniswap v4 singleton on Robinhood Chain. Checked on 2 Oct 2026: bytecode is
 * present (eth_getCode) and it emits the v4 Initialize event. This is the
 * contract every hooked pool lives in; Rule Craft reads it, it does not own it.
 */
export const UNISWAP_V4 = {
  poolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
  /** keccak256("Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)") */
  initializeTopic: "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438",
} as const;

/** RPC for server code: the private endpoint when set, else the public one. */
export function serverRpc() {
  return process.env.ROBINHOOD_RPC_URL || PUBLIC_RPC;
}

export const TOKEN = {
  get isLive() {
    return isAddress(BRAND.ca);
  },
};

/**
 * Rule Craft contracts. Nothing of ours is deployed on mainnet yet; every
 * entry stays empty until launch and the site says so instead of inventing
 * numbers or addresses.
 */
export const CONTRACTS: { name: string; role: string; address: string }[] = [
  { name: "RuleHook", role: "The root v4 hook every Rule Craft pool points at", address: "" },
  { name: "ModuleRegistry", role: "Approved rule modules and their parameter bounds", address: "" },
  { name: "BlueprintRegistry", role: "Published blueprints, authors and royalty terms", address: "" },
  { name: "PoolLauncher", role: "Token deploy, pool initialize and first liquidity in one call", address: "" },
  { name: "RoyaltySplitter", role: "Routes each module's share to authors, LPs and treasury", address: "" },
  { name: "RuleLens", role: "Read-only view of a pool's frozen rule set", address: "" },
];

export function explorerAddress(address: string) {
  return `${CHAIN.explorer}/address/${address}`;
}
export function explorerToken(address: string) {
  return `${CHAIN.explorer}/token/${address}`;
}
export function explorerTx(hash: string) {
  return `${CHAIN.explorer}/tx/${hash}`;
}
export function explorerBlock(block: number) {
  return `${CHAIN.explorer}/block/${block}`;
}
export function shortAddress(address: string, head = 6, tail = 4) {
  if (address.length <= head + tail + 2) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/**
 * Tokens kept out of the live pool listings (brand separation). Pools that
 * include one of these addresses are skipped when the index is shown.
 */
export const HIDDEN_TOKENS = new Set(["0x18e674231a58c239dc7daedcffe15ec3a24cff5c"]);

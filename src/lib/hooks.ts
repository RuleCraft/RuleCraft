/*
 * Uniswap v4 hook permissions. A hook's address is its permission list: the
 * PoolManager only calls the callbacks whose bit is set in the lowest 14 bits
 * of the address. Bit order follows the v4-core Hooks library.
 */

export type FlagKey =
  | "beforeInitialize"
  | "afterInitialize"
  | "beforeAddLiquidity"
  | "afterAddLiquidity"
  | "beforeRemoveLiquidity"
  | "afterRemoveLiquidity"
  | "beforeSwap"
  | "afterSwap"
  | "beforeDonate"
  | "afterDonate"
  | "beforeSwapReturnDelta"
  | "afterSwapReturnDelta"
  | "afterAddLiquidityReturnDelta"
  | "afterRemoveLiquidityReturnDelta";

export type FlagInfo = {
  key: FlagKey;
  bit: number;
  label: string;
  /** What the PoolManager hands the hook at this point, in one line. */
  meaning: string;
  /** Plain-language reason a trader or LP would care. */
  watch: string;
  /** Rough weight for the risk read: how much power the callback gives the hook. */
  weight: number;
  group: "lifecycle" | "liquidity" | "swap" | "donate" | "delta";
};

export const FLAGS: FlagInfo[] = [
  { key: "beforeInitialize", bit: 13, label: "beforeInitialize", group: "lifecycle", weight: 1, meaning: "Runs before the pool's starting price is set.", watch: "Can refuse to open the pool or check who opens it." },
  { key: "afterInitialize", bit: 12, label: "afterInitialize", group: "lifecycle", weight: 1, meaning: "Runs once the pool exists.", watch: "Usually records the opening block or stores per-pool settings." },
  { key: "beforeAddLiquidity", bit: 11, label: "beforeAddLiquidity", group: "liquidity", weight: 3, meaning: "Runs before anyone adds liquidity.", watch: "Can restrict who provides liquidity or in which range." },
  { key: "afterAddLiquidity", bit: 10, label: "afterAddLiquidity", group: "liquidity", weight: 2, meaning: "Runs after liquidity is added.", watch: "Often used to track LP positions for rewards." },
  { key: "beforeRemoveLiquidity", bit: 9, label: "beforeRemoveLiquidity", group: "liquidity", weight: 8, meaning: "Runs before anyone removes liquidity.", watch: "Can delay or block LP exits. Read the unlock terms." },
  { key: "afterRemoveLiquidity", bit: 8, label: "afterRemoveLiquidity", group: "liquidity", weight: 2, meaning: "Runs after liquidity is removed.", watch: "Settles rewards or exit fees for the leaving LP." },
  { key: "beforeSwap", bit: 7, label: "beforeSwap", group: "swap", weight: 4, meaning: "Runs before every swap, can override the LP fee.", watch: "Fees can change per trade. Check the fee range." },
  { key: "afterSwap", bit: 6, label: "afterSwap", group: "swap", weight: 3, meaning: "Runs after every swap with the final amounts.", watch: "Reacts to trades: burns, pots, reward accounting." },
  { key: "beforeDonate", bit: 5, label: "beforeDonate", group: "donate", weight: 1, meaning: "Runs before a donation to in-range LPs.", watch: "Can gate who may donate to the pool." },
  { key: "afterDonate", bit: 4, label: "afterDonate", group: "donate", weight: 1, meaning: "Runs after a donation.", watch: "Bookkeeping for donated rewards." },
  { key: "beforeSwapReturnDelta", bit: 3, label: "beforeSwapReturnDelta", group: "delta", weight: 9, meaning: "Lets beforeSwap take or give tokens itself.", watch: "The hook can change what you pay in. Read every rule that uses it." },
  { key: "afterSwapReturnDelta", bit: 2, label: "afterSwapReturnDelta", group: "delta", weight: 8, meaning: "Lets afterSwap take a cut of the output.", watch: "The hook can change what you receive. Taxes and burns live here." },
  { key: "afterAddLiquidityReturnDelta", bit: 1, label: "afterAddLiquidityReturnDelta", group: "delta", weight: 6, meaning: "Lets the hook adjust an LP deposit.", watch: "Deposit fees or rebates on adding liquidity." },
  { key: "afterRemoveLiquidityReturnDelta", bit: 0, label: "afterRemoveLiquidityReturnDelta", group: "delta", weight: 7, meaning: "Lets the hook adjust an LP withdrawal.", watch: "Exit fees on removing liquidity." },
];

export const FLAG_BY_KEY = Object.fromEntries(FLAGS.map((f) => [f.key, f])) as Record<FlagKey, FlagInfo>;

/** v4 marks a pool whose LP fee the hook sets per swap with this fee value. */
export const DYNAMIC_FEE_FLAG = 0x800000;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Reads the 14 permission bits out of a hook address. */
export function flagsFromAddress(address: string): FlagKey[] {
  const low = Number(BigInt(address) & 0x3fffn);
  return FLAGS.filter((f) => (low >> f.bit) & 1).map((f) => f.key);
}

/** The 14-bit mask a hook needs for a set of callbacks, as a number and as hex. */
export function maskFor(keys: Iterable<FlagKey>) {
  let mask = 0;
  for (const k of keys) mask |= 1 << FLAG_BY_KEY[k].bit;
  return { mask, hex: "0x" + mask.toString(16).padStart(4, "0"), binary: mask.toString(2).padStart(14, "0") };
}

/**
 * A v4 hook address is only valid if every *ReturnDelta flag comes with its
 * base callback. Returns the problems, empty when consistent.
 */
export function flagProblems(keys: FlagKey[]): string[] {
  const has = new Set(keys);
  const out: string[] = [];
  if (has.has("beforeSwapReturnDelta") && !has.has("beforeSwap")) out.push("beforeSwapReturnDelta is set without beforeSwap.");
  if (has.has("afterSwapReturnDelta") && !has.has("afterSwap")) out.push("afterSwapReturnDelta is set without afterSwap.");
  if (has.has("afterAddLiquidityReturnDelta") && !has.has("afterAddLiquidity")) out.push("afterAddLiquidityReturnDelta is set without afterAddLiquidity.");
  if (has.has("afterRemoveLiquidityReturnDelta") && !has.has("afterRemoveLiquidity")) out.push("afterRemoveLiquidityReturnDelta is set without afterRemoveLiquidity.");
  return out;
}

/** v4 fee value in hundredths of a basis point, as a percent string. */
export function feeLabel(fee: number) {
  if (fee === DYNAMIC_FEE_FLAG) return "Dynamic";
  const pct = fee / 10_000;
  return `${pct.toLocaleString("en-US", { maximumFractionDigits: 4 })}%`;
}

"use client";

import { encodeAbiParameters, keccak256, type Hex } from "viem";
import { ABI, read, type PoolKeyTuple } from "@/lib/onchain";

export type LaunchInfo = {
  id: number;
  creator: string;
  token: string;
  key: PoolKeyTuple;
  poolId: string;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  unlockAt: number;
  withdrawn: boolean;
  symbol: string;
  name: string;
};

export function poolIdOf(key: PoolKeyTuple): string {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "uint24" },
        { type: "int24" },
        { type: "address" },
      ],
      [key.currency0 as Hex, key.currency1 as Hex, key.fee, key.tickSpacing, key.hooks as Hex],
    ),
  );
}

type RawLaunch = { creator: string; token: string; key: { currency0: string; currency1: string; fee: number; tickSpacing: number; hooks: string }; tickLower: number; tickUpper: number; liquidity: bigint; unlockAt: bigint; withdrawn: boolean };

export async function readLaunch(launcher: string, id: number): Promise<LaunchInfo> {
  const l = await read<RawLaunch>(launcher, ABI.launcher, "getLaunch", [BigInt(id)]);
  const key: PoolKeyTuple = { currency0: l.key.currency0, currency1: l.key.currency1, fee: Number(l.key.fee), tickSpacing: Number(l.key.tickSpacing), hooks: l.key.hooks };
  const [symbol, name] = await Promise.all([
    read<string>(l.token, ABI.token, "symbol").catch(() => "TOKEN"),
    read<string>(l.token, ABI.token, "name").catch(() => ""),
  ]);
  return {
    id,
    creator: l.creator,
    token: l.token,
    key,
    poolId: poolIdOf(key),
    tickLower: Number(l.tickLower),
    tickUpper: Number(l.tickUpper),
    liquidity: l.liquidity,
    unlockAt: Number(l.unlockAt),
    withdrawn: l.withdrawn,
    symbol,
    name,
  };
}

export async function readRecentLaunches(launcher: string, max = 20): Promise<LaunchInfo[]> {
  const n = Number(await read<bigint>(launcher, ABI.launcher, "launchCount"));
  const ids = Array.from({ length: Math.min(n, max) }, (_, i) => n - i);
  return Promise.all(ids.map((id) => readLaunch(launcher, id)));
}

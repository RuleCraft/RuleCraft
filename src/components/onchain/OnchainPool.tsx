"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { encodeFunctionData } from "viem";
import { explorerAddress, shortAddress } from "@/config/brand";
import { ABI, describeRules, formatUnits18, normRules, parseUnits18, quoteExactIn, read, type OnchainRules } from "@/lib/onchain";
import { rpc } from "@/lib/rpc";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConnectButton } from "@/components/wallet/WalletButton";
import { useDeployment } from "@/components/onchain/useDeployment";
import { useTx } from "@/components/onchain/useTx";
import { TxStatus } from "@/components/onchain/TxStatus";
import { readLaunch, type LaunchInfo } from "@/components/onchain/launches";
import { Badge, Stat } from "@/components/ui/Page";

const DEAD = "0x000000000000000000000000000000000000dEaD";

type PoolState = {
  launch: LaunchInfo;
  rules: OnchainRules;
  maxBuyPerBlock: bigint;
  openBlock: number;
  blueprintId: number;
  author: string;
  royaltyBps: number;
  protocolBps: number;
  guardActive: boolean;
  block: number;
  burned: bigint;
  supply: bigint;
};

/** Everything a Rule Craft pool stores on chain, plus a swap box. Renders nothing for other pools. */
export function OnchainPool({ poolId }: { poolId: string }) {
  const dep = useDeployment();
  const [s, setS] = useState<PoolState | null>(null);
  const [notOurs, setNotOurs] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!dep.deployed) return;
    try {
      const lid = Number(await read<bigint>(dep.launcher, ABI.launcher, "launchOfPool", [poolId]));
      if (!lid) {
        setNotOurs(true);
        return;
      }
      const [launch, pr, guard, blockHex] = await Promise.all([
        readLaunch(dep.launcher, lid),
        read<{ rules: Record<string, unknown>; maxBuyPerBlock: bigint; openBlock: bigint; blueprintId: bigint; author: string; royaltyBps: number; protocolBps: number }>(dep.hook, ABI.hook, "poolRules", [poolId]),
        read<boolean>(dep.hook, ABI.hook, "guardActive", [poolId]),
        rpc<string>("eth_blockNumber"),
      ]);
      const [burned, supply] = await Promise.all([read<bigint>(launch.token, ABI.token, "balanceOf", [DEAD]), read<bigint>(launch.token, ABI.token, "totalSupply")]);
      setS({
        launch,
        rules: normRules(pr.rules),
        maxBuyPerBlock: pr.maxBuyPerBlock,
        openBlock: Number(pr.openBlock),
        blueprintId: Number(pr.blueprintId),
        author: pr.author,
        royaltyBps: Number(pr.royaltyBps),
        protocolBps: Number(pr.protocolBps),
        guardActive: guard,
        block: Number(BigInt(blockHex)),
        burned,
        supply,
      });
    } catch {
      // Leave the last good read in place; the server panel below still renders.
    }
  }, [dep.deployed, dep.launcher, dep.hook, poolId]);

  useEffect(() => {
    load();
  }, [load, tick]);

  if (!dep.deployed || notOurs) return null;
  if (!s) return <p className="mb-8 font-mono text-[13px] text-ink-3">Checking whether this is a Rule Craft pool…</p>;

  const lines = describeRules(s.rules);
  const guardLeft = s.guardActive ? s.openBlock + s.rules.guardBlocks - s.block : 0;
  const unlock = new Date(s.launch.unlockAt * 1000);

  return (
    <section className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" data-onchain-pool>
      <div className="grid min-w-0 grid-cols-1 content-start gap-6">
        <div className="card tick p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="signal">Rule Craft pool</Badge>
            <Badge tone="warn">Unaudited</Badge>
            {s.guardActive ? <Badge tone="danger">Guard on · {guardLeft} blocks left</Badge> : null}
          </div>
          <p className="mt-3 font-display text-[30px] leading-tight text-ink [overflow-wrap:anywhere]">
            {s.launch.name} <span className="text-ink-3">· {s.launch.symbol}</span>
          </p>
          <p className="mt-1 break-all font-mono text-[12px] text-ink-3">
            token{" "}
            <a href={explorerAddress(s.launch.token)} target="_blank" rel="noreferrer" className="hover:text-signal">
              {s.launch.token}
            </a>
          </p>
          <p className="label mt-6">Rules, read from the hook</p>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-[14.5px] text-ink" data-onchain-rules>
            {lines.map((l) => (
              <li key={l} className="flex gap-2">
                <span className="mt-[9px] size-1.5 shrink-0 bg-signal" />
                <span className="min-w-0">{l}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-5">
          <Stat label="Burned" value={`${formatUnits18(s.burned, 0)}`} note={`${((Number(s.burned) / Number(s.supply)) * 100).toFixed(3)}% of supply`} />
          <Stat label="Guard cap / block" value={s.rules.modules & 1 ? formatUnits18(s.maxBuyPerBlock, 0) : "--"} note={s.launch.symbol} />
          <Stat label="Blueprint" value={s.blueprintId ? `#${s.blueprintId}` : "none"} note={s.blueprintId ? `royalty ${s.royaltyBps / 100}% to ${shortAddress(s.author)}` : "no royalty"} />
          <Stat label="Protocol share" value={`${s.protocolBps / 100}%`} note="of add-on revenue" />
          <Stat label="Founding liquidity" value={s.launch.withdrawn ? "withdrawn" : s.rules.modules & 16 ? "locked" : "unlocked"} note={s.rules.modules & 16 ? `until ${unlock.toISOString().slice(0, 10)}` : `creator ${shortAddress(s.launch.creator)}`} />
        </div>
        <CreatorActions launch={s.launch} onDone={() => setTick((x) => x + 1)} />
      </div>
      <SwapBox launch={s.launch} guard={s.guardActive} onDone={() => setTick((x) => x + 1)} />
    </section>
  );
}

function SwapBox({ launch, guard, onDone }: { launch: LaunchInfo; guard: boolean; onDone: () => void }) {
  const { address, onRobinhoodChain, balance } = useWallet();
  const dep = useDeployment();
  const tx = useTx();
  const [buy, setBuy] = useState(true);
  const [amount, setAmount] = useState("0.01");
  const [quote, setQuote] = useState<bigint | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [tokenBal, setTokenBal] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const amountWei = useMemo(() => parseUnits18(amount), [amount]);

  const refresh = useCallback(async () => {
    if (!address) return;
    const [b, a] = await Promise.all([
      read<bigint>(launch.token, ABI.token, "balanceOf", [address]).catch(() => null),
      read<bigint>(launch.token, ABI.token, "allowance", [address, dep.launcher]).catch(() => 0n),
    ]);
    setTokenBal(b);
    setAllowance(a ?? 0n);
  }, [address, launch.token, dep.launcher]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setQuote(null);
    setQuoteErr(null);
    if (amountWei <= 0n) return;
    let live = true;
    const t = window.setTimeout(async () => {
      try {
        const q = await quoteExactIn(launch.key, buy, amountWei);
        if (live) setQuote(q);
      } catch {
        if (live) setQuoteErr(buy && guard ? "No quote: this buy is above the guard's per-block cap, or the pool cannot fill it." : "No quote for this amount.");
      }
    }, 350);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [amountWei, buy, launch.key, guard]);

  const minOut = quote !== null ? (quote * 99n) / 100n : 0n;
  const needsApprove = !buy && allowance < amountWei;

  async function approve() {
    const r = await tx.send({ to: launch.token, data: encodeFunctionData({ abi: ABI.token, functionName: "approve", args: [dep.launcher, amountWei] }) });
    if (r) refresh();
  }
  async function swap() {
    if (!address) return;
    const data = encodeFunctionData({ abi: ABI.launcher, functionName: "swapExactIn", args: [launch.key, buy, amountWei, minOut, address] });
    const r = await tx.send({ to: dep.launcher, data, value: buy ? amountWei : 0n });
    if (r) {
      refresh();
      onDone();
    }
  }

  return (
    <aside className="card h-fit p-5 sm:p-6" data-swap-box>
      <div className="grid grid-cols-2 gap-1">
        {[true, false].map((b) => (
          <button key={String(b)} type="button" onClick={() => setBuy(b)} className={`rounded-[3px] border px-3 py-2 text-[14px] ${buy === b ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"}`} data-side={b ? "buy" : "sell"}>
            {b ? "Buy" : "Sell"}
          </button>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="mb-1 block text-[13px] text-ink">You pay ({buy ? "ETH" : launch.symbol})</span>
        <input className="field num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} data-field="swap-amount" />
      </label>
      <p className="mt-1 font-mono text-[11.5px] text-ink-3">
        balance {buy ? (balance ?? "--") + " ETH" : tokenBal !== null ? formatUnits18(tokenBal, 2) + " " + launch.symbol : "--"}
      </p>
      <div className="mt-4 rounded-[4px] border border-line bg-paper px-3 py-2.5" data-quote>
        <p className="label">You receive (quoted by the v4 Quoter)</p>
        <p className="num mt-1 text-[20px] text-ink [overflow-wrap:anywhere]">{quote !== null ? `${formatUnits18(quote, 4)} ${buy ? launch.symbol : "ETH"}` : quoteErr ? "--" : amountWei > 0n ? "…" : "--"}</p>
        {quoteErr ? <p className="mt-1 text-[12.5px] text-danger">{quoteErr}</p> : <p className="mt-1 text-[12px] text-ink-3">After every rule. Minimum accepted: 1% below the quote.</p>}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2">
        {!address ? (
          <ConnectButton className="btn btn-signal w-full" />
        ) : needsApprove ? (
          <button type="button" className="btn btn-line w-full" disabled={!onRobinhoodChain || tx.busy || amountWei <= 0n} onClick={approve} data-approve>
            Approve {launch.symbol}
          </button>
        ) : (
          <button type="button" className="btn btn-signal w-full" disabled={!onRobinhoodChain || tx.busy || amountWei <= 0n || quote === null} onClick={swap} data-swap>
            {buy ? "Buy" : "Sell"}
          </button>
        )}
      </div>
      <TxStatus state={tx.state} hash={tx.hash} error={tx.error} doneText="Swapped." />
      <p className="mt-3 text-[12px] text-ink-3">Routed by the Rule Craft launcher straight into the Uniswap v4 PoolManager. Unaudited.</p>
    </aside>
  );
}

function CreatorActions({ launch, onDone }: { launch: LaunchInfo; onDone: () => void }) {
  const { address } = useWallet();
  const dep = useDeployment();
  const tx = useTx();
  if (!address || address.toLowerCase() !== launch.creator.toLowerCase()) return null;
  const locked = Date.now() / 1000 < launch.unlockAt;
  const call = async (fn: "collectFees" | "withdrawLiquidity") => {
    const r = await tx.send({ to: dep.launcher, data: encodeFunctionData({ abi: ABI.launcher, functionName: fn, args: [BigInt(launch.id)] }) });
    if (r) onDone();
  };
  return (
    <div className="card p-5" data-creator-actions>
      <p className="label">You created this pool</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm btn-line" disabled={tx.busy || launch.withdrawn} onClick={() => call("collectFees")} data-collect>
          Collect LP fees
        </button>
        <button type="button" className="btn btn-sm btn-line" disabled={tx.busy || launch.withdrawn || locked} onClick={() => call("withdrawLiquidity")} data-withdraw>
          {locked ? `Locked until ${new Date(launch.unlockAt * 1000).toISOString().slice(0, 10)}` : "Withdraw founding liquidity"}
        </button>
      </div>
      <TxStatus state={tx.state} hash={tx.hash} error={tx.error} />
    </div>
  );
}

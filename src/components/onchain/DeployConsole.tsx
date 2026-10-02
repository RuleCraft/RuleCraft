"use client";

import { useEffect, useMemo, useState } from "react";
import { concat, encodeAbiParameters, encodeFunctionData, keccak256, type Hex } from "viem";
import { CHAIN, UNISWAP_V4, explorerAddress, isAddress, shortAddress } from "@/config/brand";
import { CREATE2_DEPLOYER, HOOK_FLAGS, LOCAL_DEPLOY, LOCAL_DEPLOY_KEY } from "@/config/deployment";
import { ABI, BYTECODE, create2Address, hasCode, mineHookSalt, read } from "@/lib/onchain";
import { rpc } from "@/lib/rpc";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConnectButton } from "@/components/wallet/WalletButton";
import { useDeployment } from "@/components/onchain/useDeployment";
import { useTx } from "@/components/onchain/useTx";
import { TxStatus } from "@/components/onchain/TxStatus";
import { Badge } from "@/components/ui/Page";
import { CheckIcon, CopyIcon } from "@/components/icons";

type Progress = { treasury: string; protocolBps: number; deployer: string; registry: string; launcher: string; hook: string; salt: string; hookSet: boolean };
const KEY = "rulecraft.deployProgress";
const EMPTY: Progress = { treasury: "", protocolBps: 1000, deployer: "", registry: "", launcher: "", hook: "", salt: "", hookSet: false };

function load(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Progress) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Gas cost estimate in ETH for a transaction, read through the relay. */
async function estimate(tx: { from: string; to?: string; data: string }): Promise<string | null> {
  try {
    const [gas, price] = await Promise.all([rpc<string>("eth_estimateGas", [tx]), rpc<string>("eth_gasPrice", [])]);
    const wei = BigInt(gas) * BigInt(price);
    return `${Number(BigInt(gas)).toLocaleString("en-US")} gas ≈ ${(Number(wei) / 1e18).toFixed(6)} ETH`;
  } catch {
    return null;
  }
}

export function DeployConsole() {
  const { address, onRobinhoodChain } = useWallet();
  const current = useDeployment();
  const [p, setP] = useState<Progress>(EMPTY);
  const [ready, setReady] = useState(false);
  const [mining, setMining] = useState<string | null>(null);
  const [est, setEst] = useState<Record<string, string | null>>({});
  const [copied, setCopied] = useState(false);
  const [checks, setChecks] = useState<{ label: string; ok: boolean | null }[]>([]);
  const tx = useTx();

  useEffect(() => {
    setP(load());
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // Storage blocked: progress lives only in this tab.
    }
  }, [p, ready]);
  useEffect(() => {
    if (address && !p.treasury) setP((x) => ({ ...x, treasury: address }));
  }, [address, p.treasury]);

  const treasuryOk = isAddress(p.treasury);
  const bpsOk = Number.isInteger(p.protocolBps) && p.protocolBps >= 0 && p.protocolBps <= 3000;

  const registryData = useMemo(
    () => (treasuryOk && bpsOk ? concat([BYTECODE.registry, encodeAbiParameters([{ type: "address" }, { type: "uint16" }], [p.treasury as Hex, p.protocolBps])]) : null),
    [p.treasury, p.protocolBps, treasuryOk, bpsOk],
  );
  const launcherData = useMemo(
    () => (isAddress(p.registry) ? concat([BYTECODE.launcher, encodeAbiParameters([{ type: "address" }, { type: "address" }], [UNISWAP_V4.poolManager as Hex, p.registry as Hex])]) : null),
    [p.registry],
  );
  const hookInit = useMemo(
    () =>
      isAddress(p.launcher) && treasuryOk
        ? concat([BYTECODE.hook, encodeAbiParameters([{ type: "address" }, { type: "address" }, { type: "address" }], [UNISWAP_V4.poolManager as Hex, p.launcher as Hex, p.treasury as Hex])])
        : null,
    [p.launcher, p.treasury, treasuryOk],
  );

  useEffect(() => {
    if (!address) return;
    let live = true;
    (async () => {
      const out: Record<string, string | null> = {};
      if (registryData) out.registry = await estimate({ from: address, data: registryData });
      if (launcherData) out.launcher = await estimate({ from: address, data: launcherData });
      if (live) setEst(out);
    })();
    return () => {
      live = false;
    };
  }, [address, registryData, launcherData]);

  const step = !isAddress(p.registry) ? 1 : !isAddress(p.launcher) ? 2 : !isAddress(p.hook) ? 3 : !p.hookSet ? 4 : 5;
  const canSend = Boolean(address && onRobinhoodChain) && !tx.busy && !mining;

  async function deployRegistry() {
    if (!registryData || !address) return;
    const r = await tx.send({ data: registryData });
    if (r?.contractAddress) setP((x) => ({ ...x, registry: r.contractAddress!, deployer: address }));
  }
  async function deployLauncher() {
    if (!launcherData || !address) return;
    const r = await tx.send({ data: launcherData });
    if (r?.contractAddress) setP((x) => ({ ...x, launcher: r.contractAddress!, deployer: address }));
  }
  async function deployHook() {
    if (!hookInit) return;
    setMining("Mining a salt for the hook address…");
    const initHash = keccak256(hookInit);
    let found: { salt: Hex; address: string; tried: number };
    try {
      found = p.salt && create2Address(p.salt as Hex, initHash).toLowerCase() === p.hook.toLowerCase() ? { salt: p.salt as Hex, address: p.hook, tried: 0 } : await mineHookSalt(initHash, (n) => setMining(`Mining a salt for the hook address… ${n.toLocaleString("en-US")} tried`));
    } finally {
      setMining(null);
    }
    if (await hasCode(found.address).catch(() => false)) {
      setP((x) => ({ ...x, hook: found.address, salt: found.salt }));
      return;
    }
    const r = await tx.send({ to: CREATE2_DEPLOYER, data: concat([found.salt, hookInit]) });
    if (r && (await hasCode(found.address).catch(() => false))) setP((x) => ({ ...x, hook: found.address, salt: found.salt }));
  }
  async function wire() {
    const r = await tx.send({ to: p.launcher, data: encodeFunctionData({ abi: ABI.launcher, functionName: "setHook", args: [p.hook] }) });
    if (r) setP((x) => ({ ...x, hookSet: true }));
  }

  const snippet = `export const DEPLOYMENT = {
  registry: "${p.registry}",
  launcher: "${p.launcher}",
  hook: "${p.hook}",
  deployBlock: 0, // optional: block of the registry deployment
};`;

  async function verify(target: { registry: string; launcher: string; hook: string }) {
    const list: { label: string; ok: boolean | null }[] = [];
    const safe = async <T,>(f: () => Promise<T>) => f().catch(() => null);
    list.push({ label: "Registry has code", ok: await safe(() => hasCode(target.registry)) });
    list.push({ label: "Launcher has code", ok: await safe(() => hasCode(target.launcher)) });
    list.push({ label: "Hook has code", ok: await safe(() => hasCode(target.hook)) });
    list.push({ label: `Hook address ends in permission bits 0x${HOOK_FLAGS.toString(16)}`, ok: (Number.parseInt(target.hook.slice(-4), 16) & 0x3fff) === HOOK_FLAGS });
    const lh = await safe(() => read<string>(target.launcher, ABI.launcher, "hook"));
    list.push({ label: "Launcher points at this hook", ok: lh ? lh.toLowerCase() === target.hook.toLowerCase() : null });
    const hl = await safe(() => read<string>(target.hook, ABI.hook, "launcher"));
    list.push({ label: "Hook points at this launcher", ok: hl ? hl.toLowerCase() === target.launcher.toLowerCase() : null });
    const pm = await safe(() => read<string>(target.hook, ABI.hook, "poolManager"));
    list.push({ label: "Hook uses the Uniswap v4 PoolManager", ok: pm ? pm.toLowerCase() === UNISWAP_V4.poolManager.toLowerCase() : null });
    setChecks(list);
  }

  const card = "card p-5 sm:p-6";
  const row = (n: number, title: string, body: React.ReactNode, action: React.ReactNode, doneValue?: string) => (
    <li className={`${card} ${step === n ? "border-ink" : ""}`} data-deploy-step={n}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label">Step {n}</p>
          <p className="mt-1 text-[17px] font-medium text-ink">{title}</p>
        </div>
        {step > n ? <Badge tone="pass">Done</Badge> : step === n ? <Badge tone="signal">Next</Badge> : <Badge>Waiting</Badge>}
      </div>
      <div className="mt-3 text-[14px] leading-[1.6] text-ink-2">{body}</div>
      {doneValue ? (
        <p className="mt-3 break-all font-mono text-[12.5px] text-ink">
          <a href={explorerAddress(doneValue)} target="_blank" rel="noreferrer" className="hover:text-signal">
            {doneValue}
          </a>
        </p>
      ) : null}
      {step === n ? <div className="mt-4 flex flex-wrap items-center gap-3">{action}</div> : null}
    </li>
  );

  return (
    <div className="wrap grid grid-cols-1 gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_360px]" data-deploy-console>
      <div className="grid min-w-0 grid-cols-1 content-start gap-4">
        <div className="card tick p-5 sm:p-6">
          <p className="label">Before you start</p>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-[14px] text-ink-2">
            <li>Connect the wallet that should be recorded as deployer. The same wallet must send steps 2 and 4.</li>
            <li>Every step is a normal transaction you sign. Nothing here holds a key; progress is saved in this browser so a reload does not lose it.</li>
            <li>The contracts are <strong className="font-medium text-ink">unaudited</strong>. There is no owner, no upgrade path and no admin function after step 4.</li>
          </ul>
          {!address ? (
            <div className="mt-4">
              <ConnectButton className="btn btn-signal" />
            </div>
          ) : !onRobinhoodChain ? (
            <p className="mt-4 text-[13.5px] text-danger">Switch the wallet to {CHAIN.name} from the account menu.</p>
          ) : (
            <p className="mt-4 font-mono text-[12.5px] text-ink-2">Deployer {shortAddress(address)}</p>
          )}
        </div>

        <ol className="grid grid-cols-1 gap-4">
          {row(
            1,
            "Deploy BlueprintRegistry",
            <>
              <p>Holds published blueprints and fixes the treasury and protocol share for good.</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                <label className="block min-w-0">
                  <span className="mb-1 block text-[13px] text-ink">Treasury address</span>
                  <input className="field font-mono !text-[13px]" value={p.treasury} onChange={(e) => setP((x) => ({ ...x, treasury: e.target.value.trim() }))} disabled={step > 1} data-field="treasury" />
                  {p.treasury && !treasuryOk ? <span className="mt-1 block text-[12.5px] text-danger">0x followed by 40 hex characters.</span> : null}
                </label>
                <label className="block min-w-0">
                  <span className="mb-1 block text-[13px] text-ink">Protocol share (bps)</span>
                  <input type="number" className="field num" min={0} max={3000} value={p.protocolBps} onChange={(e) => setP((x) => ({ ...x, protocolBps: Math.round(Number(e.target.value) || 0) }))} disabled={step > 1} data-field="protocol-bps" />
                  <span className="mt-1 block text-[12px] text-ink-3">{(p.protocolBps / 100).toFixed(2)}% of add-on revenue · max 3000</span>
                </label>
              </div>
              {est.registry ? <p className="mt-2 font-mono text-[12px] text-ink-3">{est.registry}</p> : null}
            </>,
            <button type="button" className="btn btn-signal" disabled={!canSend || !registryData} onClick={deployRegistry} data-deploy-action="registry">
              Deploy registry
            </button>,
            isAddress(p.registry) ? p.registry : undefined,
          )}
          {row(
            2,
            "Deploy RuleCraftLauncher",
            <>
              <p>Creates tokens, opens their pools, holds founding liquidity and routes swaps. Points at the Uniswap v4 PoolManager {shortAddress(UNISWAP_V4.poolManager)}.</p>
              {est.launcher ? <p className="mt-2 font-mono text-[12px] text-ink-3">{est.launcher}</p> : null}
            </>,
            <button type="button" className="btn btn-signal" disabled={!canSend || !launcherData} onClick={deployLauncher} data-deploy-action="launcher">
              Deploy launcher
            </button>,
            isAddress(p.launcher) ? p.launcher : undefined,
          )}
          {row(
            3,
            "Mine and deploy RuleCraftHook",
            <p>
              The hook&apos;s address must end in its permission bits (0x{HOOK_FLAGS.toString(16)}). This browser searches for a CREATE2 salt (about 16,000 tries on average), then deploys through the
              deterministic deployer {shortAddress(CREATE2_DEPLOYER)}.
            </p>,
            <>
              <button type="button" className="btn btn-signal" disabled={!canSend || !hookInit} onClick={deployHook} data-deploy-action="hook">
                Mine salt and deploy hook
              </button>
              {mining ? <span className="font-mono text-[12px] text-ink-3">{mining}</span> : null}
            </>,
            isAddress(p.hook) ? p.hook : undefined,
          )}
          {row(
            4,
            "Wire the launcher to the hook",
            <p>One call, allowed exactly once and only from the deployer wallet. After it, nothing in the system has an owner.</p>,
            <button type="button" className="btn btn-signal" disabled={!canSend || address?.toLowerCase() !== p.deployer.toLowerCase()} onClick={wire} data-deploy-action="wire">
              Set hook on launcher
            </button>,
          )}
        </ol>
        <TxStatus state={tx.state} hash={tx.hash} error={tx.error} />

        {step === 5 ? (
          <div className="card p-5 sm:p-6" data-deploy-done>
            <p className="label">Done: put these in src/config/deployment.ts</p>
            <pre className="mt-3 overflow-x-auto rounded-[4px] bg-night p-4 font-mono text-[12px] leading-[1.6] text-[#e9e6dc]">{snippet}</pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm btn-line"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(snippet);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  } catch {
                    // Clipboard blocked; the snippet stays selectable.
                  }
                }}
              >
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />} {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" className="btn btn-sm btn-line" onClick={() => verify(p)}>
                Verify on chain
              </button>
              {LOCAL_DEPLOY ? (
                <button
                  type="button"
                  className="btn btn-sm btn-signal"
                  data-use-local
                  onClick={() => {
                    try {
                      window.localStorage.setItem(LOCAL_DEPLOY_KEY, JSON.stringify({ registry: p.registry, launcher: p.launcher, hook: p.hook }));
                      window.dispatchEvent(new Event("rulecraft:deployment"));
                    } catch {
                      // Storage blocked.
                    }
                  }}
                >
                  Use on this browser (local build)
                </button>
              ) : null}
            </div>
            <p className="mt-3 text-[13px] text-ink-3">Commit the file and redeploy the site. Until then the live site keeps saying &quot;Not deployed yet&quot;.</p>
          </div>
        ) : null}
        <button type="button" className="justify-self-start font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-3 hover:text-danger" onClick={() => setP({ ...EMPTY, treasury: address ?? "" })}>
          Start over (forgets progress in this browser)
        </button>
      </div>

      <aside className="grid content-start gap-4">
        <div className="card p-5">
          <p className="label">Site is using</p>
          {current.deployed ? (
            <dl className="mt-3 grid grid-cols-1 gap-2 font-mono text-[12px]">
              {(["registry", "launcher", "hook"] as const).map((k) => (
                <div key={k} className="min-w-0">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="break-all text-ink">{current[k]}</dd>
                </div>
              ))}
              <dd className="text-ink-3">source: {current.source === "local" ? "this browser (local build)" : "src/config/deployment.ts"}</dd>
            </dl>
          ) : (
            <p className="mt-3 text-[14px] text-ink-2" data-site-not-deployed>
              Not deployed yet.
            </p>
          )}
          {current.deployed ? (
            <button type="button" className="btn btn-sm btn-line mt-4" onClick={() => verify(current)} data-verify>
              Verify on chain
            </button>
          ) : null}
          {checks.length ? (
            <ul className="mt-4 grid grid-cols-1 gap-1.5 text-[13px]" data-verify-results>
              {checks.map((c) => (
                <li key={c.label} className={`flex items-start gap-2 ${c.ok ? "text-pass" : c.ok === false ? "text-danger" : "text-ink-3"}`}>
                  <span className="num shrink-0">{c.ok ? "✓" : c.ok === false ? "✗" : "?"}</span>
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="card p-5 text-[13.5px] leading-[1.6] text-ink-2">
          <p className="label">What each contract can do</p>
          <ul className="mt-3 grid grid-cols-1 gap-2">
            <li>
              <span className="text-ink">Registry</span>: store blueprints; fixed treasury and protocol share.
            </li>
            <li>
              <span className="text-ink">Launcher</span>: launch, swap (exact input), hold founding liquidity for its creator.
            </li>
            <li>
              <span className="text-ink">Hook</span>: apply each pool&apos;s frozen rules; pay royalties and protocol share to whoever is owed.
            </li>
          </ul>
          <p className="mt-3">No function anywhere can move user or pool funds to the deployer.</p>
        </div>
      </aside>
    </div>
  );
}

# Rule Craft

**Craft your rules. Earn forever.**
Modular infrastructure for Uniswap v4 hooks, on Robinhood Chain.

Website: https://rulecraft.fun · X: https://x.com/rulecraftfun

## The problem

Uniswap v4 lets every pool carry a hook: a contract that runs before and after swaps, liquidity changes and pool creation. That makes a pool programmable, and it also makes it opaque.

- **Traders** cannot tell what a hook will do to their trade. A hook can take a cut of the output, change the fee per swap, or block withdrawals, and none of it shows up in a normal quote.
- **Launchers** who want simple protections (an anti-bot window, a fee that scales with size, a burn) have to write and trust a new hook every time.
- **Hook authors** who write a good rule have no way to be paid when others reuse it.
- **LPs and analysts** have no common language for comparing one hooked pool with another.

## The solution

Rule Craft turns hook logic into bounded, reusable **rule modules** behind one hook, and makes every combination readable before any capital moves.

- **Compose:** switch modules on, set their numbers, and see the exact permission bits, callbacks, v4 fee setting, worst-case take per trade and conflicts.
- **Publish:** save a combination as a **blueprint** with a royalty. Its author earns a share of add-on revenue every time a pool adopts it.
- **Launch:** open a new token directly into a pool that already carries its rules (pool-first), or give a token that already trades a second pool with rules.
- **Read:** every pool page shows its rules, parameters, take and a risk grade. The scanner decodes any v4 hook on Robinhood Chain from its address.

Rule modules on chain in v1: Snipe Guard, Size-Scaled Fee, Buy Burn, LP Stream, Liquidity Timelock. Milestone Pot and Arb Recapture are planned.

> **Unaudited.** The contracts in `contracts/` have unit, fuzz and mainnet-fork tests but no independent audit. There is no owner, no upgrade path and no admin function that can move user or pool funds.

## What you can try

**Live now (reads Robinhood Chain directly)**

- **Composer** (`/builder`): pick modules, tune parameters, get the hook permission bits, a callback map, a worked buy, conflict checks, a generated JSON config and a risk read.
- **Live v4 pools** (`/app`, `/pool/<id>`): recent Uniswap v4 pools on Robinhood Chain, read straight from the PoolManager, with every hook decoded.
- **Hook scanner** (`/scan`, `/scan/<address>`): paste any hook address or pool id.
- **Wallet connect**, live ETH and USDG balances, docs, explainers, JSON endpoints (`/api/chain`, `/api/pools`, `/api/token`, `/llms.txt`).

**Live on Robinhood Chain since 2 October 2026** (unaudited contracts: start small)

- **Launch** (`/launch`): one transaction mints a fixed-supply token, opens its Uniswap v4 pool with your rules frozen, and seeds the whole supply as liquidity. Optional dev buy under the same rules.
- **Publish blueprints** from the composer; launches that use one pay its author a royalty.
- **Trade** Rule Craft pools on their pool page (quotes from Uniswap's v4 Quoter), **claim royalties** in `/portfolio`, collect or withdraw founding liquidity as the creator.

**Planned**

- Milestone Pot and Arb Recapture modules, rules for tokens that already trade, the `$RULECRAFT` token contract.

## Run it locally

Requirements: Node.js 20 or newer and npm.

1. Download ZIP from this repository (or fork it) and open a terminal in the project folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build and start:
   ```bash
   npm run build
   npm start
   ```
4. Open http://localhost:4800

Environment variables are optional; the site runs without any. To set them, copy `.env.example` to `.env.local` and fill in what you need:

| Variable | Purpose | Format |
|---|---|---|
| `ROBINHOOD_RPC_URL` | Private Robinhood Chain RPC for server reads (pool index, scanner, token reads). Without it the public RPC is used. | Full HTTPS URL, for example from your RPC provider's dashboard |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Enables WalletConnect in the wallet dialog. Without it the option shows "Not configured". | 32-character project id from cloud.reown.com |

On Vercel, add the same names under Project → Settings → Environment Variables and redeploy.

## Network in your wallet

The wallet dialog adds the network for you on connect. To add it by hand:

| Field | Value |
|---|---|
| Network name | Robinhood Chain |
| Chain id | 4663 |
| RPC URL | https://rpc.mainnet.chain.robinhood.com |
| Currency symbol | ETH |
| Block explorer | https://robinhoodchain.blockscout.com |

## Project layout

```
src/
  app/                 routes (App Router) and API routes under app/api
  components/          UI: rules/ (composer, launch), onchain/ (deploy, swap, publish, claims), pools/, wallet/, docs/
  config/              brand.ts (name, CA, chain), deployment.ts (contract addresses), modules.ts, blueprints.ts
  content/             docs, explainers and updates
  lib/                 compose.ts (rules to permissions, take, risk), onchain.ts (contract calls), hooks.ts, chain-server.ts
  contracts/           compiled ABI + bytecode used by the site
contracts/             Foundry project: src/ (Solidity), test/ (unit, fuzz, fork), setup.sh
scripts/               export-artifacts.mjs
public/                brand images and wallet logos (WebP)
```

## Token contract

`$RULECRAFT` on Robinhood Chain (chain id 4663): **published at launch.**
The address is set in one place, `src/config/brand.ts`. Until it is published, every copy button on the site is disabled. Always verify a token by its address and chain, never by its ticker.

## Contracts

Deployed on Robinhood Chain (chain id 4663) on 2 October 2026. **Unaudited.** No owner, no upgrade path.

| Contract | Address | Role |
|---|---|---|
| `RuleCraftHook` | [`0x98E67cD59f8F885E68C06D48e432CC9a77d960c4`](https://robinhoodchain.blockscout.com/address/0x98E67cD59f8F885E68C06D48e432CC9a77d960c4) | The single Uniswap v4 hook (permission mask `0x20C4`). Applies each pool's frozen rules: size-scaled LP fee, snipe guard cap and tax, buy burn, LP stream. Pays royalties and protocol share to whoever is owed. |
| `RuleCraftLauncher` | [`0x0197B4018E04642e35372A55018838382b0b6aed`](https://robinhoodchain.blockscout.com/address/0x0197B4018E04642e35372A55018838382b0b6aed) | Launches a token into its pool, holds the founding liquidity (optionally time-locked) for its creator, routes exact-input swaps. |
| `BlueprintRegistry` | [`0xb48F36Da51717698844AFe187173373ee3A994FA`](https://robinhoodchain.blockscout.com/address/0xb48F36Da51717698844AFe187173373ee3A994FA) | Published rule sets with author and royalty. Protocol share fixed at 10% of add-on revenue; treasury fixed at deployment. |

The addresses live in one file, `src/config/deployment.ts`. The `$RULECRAFT` token is a separate contract and is still published at launch.

Build and test them (needs [Foundry](https://getfoundry.sh) and git):

```bash
cd contracts
./setup.sh            # fetches the pinned Uniswap v4-core sources into contracts/lib
forge build
forge test            # unit + fuzz tests
FORK_URL=https://rpc.mainnet.chain.robinhood.com forge test --match-contract ForkTest
```

After changing a contract, run `node scripts/export-artifacts.mjs` from the project root so the site picks up the new ABI and bytecode.

## How to deploy the contracts

The official deployment is listed above. To run your own copy of the system (for example on a test fork), deploy from the site with your own wallet. No private key ever touches the code.

1. Run the site (below) or open the deployed site, go to `/deploy` and connect the wallet that should deploy.
2. Step 1 deploys `BlueprintRegistry` with the treasury address and protocol share (basis points, max 3000).
3. Step 2 deploys `RuleCraftLauncher`, pointed at the Uniswap v4 PoolManager on Robinhood Chain.
4. Step 3 mines a CREATE2 salt in your browser so the hook address ends in its permission bits, then deploys `RuleCraftHook` through the standard deterministic deployer.
5. Step 4 wires the launcher to the hook (one call, same wallet as step 2, allowed once).
6. Copy the printed snippet into `src/config/deployment.ts`, commit and redeploy the site. Use "Verify on chain" to check the wiring.

## Disclaimer

Rule Craft is pre-launch software and its contracts are unaudited. Risk grades are a heuristic read of permissions and settings, not an audit. Nothing here is financial advice.

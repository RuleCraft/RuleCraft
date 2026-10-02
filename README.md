# Rule Craft

**Craft your rules. Earn forever.**
Modular infrastructure for Uniswap v4 hooks, on Robinhood Chain.

Website: https://rulecraft.fun · X: https://x.com/rulecraft

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

Rule modules in the first release: Snipe Guard, Size-Scaled Fee, Buy Burn, LP Stream, Milestone Pot, Liquidity Timelock. Arb Recapture is planned.

## What you can try

**Live now**

- **Composer** (`/builder`): pick modules, tune parameters, get the hook permission bits, a callback map, a worked buy, conflict checks, a generated JSON config and a risk read.
- **Live v4 pools** (`/app`, `/pool/<id>`): recent Uniswap v4 pools on Robinhood Chain, read straight from the PoolManager, with every hook decoded.
- **Hook scanner** (`/scan`, `/scan/<address>`): paste any hook address or pool id.
- **Launch form** (`/launch`): five validated steps that show every call the launcher would make.
- **Existing token** (`/existing`): reads any ERC-20 on Robinhood Chain and shows the pool that would open.
- **Wallet connect**, live ETH and USDG balances, docs, explainers, JSON endpoints (`/api/chain`, `/api/pools`, `/api/token`, `/llms.txt`).

**Coming at launch**

- Rule Craft contracts (hook, module and blueprint registries, launcher, royalty splitter) and the `$RULECRAFT` token contract.
- Deploying, publishing blueprints, claiming royalties and pots. These buttons are visible but disabled and say "Opens at launch".
- The example blueprints on the site are written by the team to show the format; they are not deployed.

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
  components/          UI: rules/ (composer, launch, read-outs), pools/, wallet/, docs/, info/, site/
  config/              brand.ts (name, CA, chain, contracts), modules.ts, blueprints.ts, nav.ts, wallets.ts
  content/             docs, explainers and updates
  lib/                 compose.ts (rules to permissions, take, risk), hooks.ts (v4 flags), chain-server.ts (RPC reads)
public/                brand images and wallet logos (WebP)
```

## Token contract

`$RULECRAFT` on Robinhood Chain (chain id 4663): **published at launch.**
The address is set in one place, `src/config/brand.ts`. Until it is published, every copy button on the site is disabled. Always verify a token by its address and chain, never by its ticker.

## Disclaimer

Rule Craft is pre-launch software. Risk grades are a heuristic read of permissions and settings, not an audit. Nothing here is financial advice.

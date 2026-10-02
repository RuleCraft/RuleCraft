import { BASE_FEES, MODULE_BY_SLUG } from "@/config/modules";
import { FLAGS } from "@/lib/hooks";
import { type Block, code, h2, note, ol, p, table, ul } from "./docs/types";

export type LearnArticle = { slug: string; title: string; summary: string; minutes: number; body: Block[] };

const guard = MODULE_BY_SLUG["snipe-guard"];
const size = MODULE_BY_SLUG["size-fee"];
const bound = (m: typeof guard, k: string) => m.params.find((x) => x.key === k)!;

export const LEARN: LearnArticle[] = [
  {
    slug: "what-is-an-amm",
    title: "What is an automated market maker?",
    summary: "How a pool of two tokens can quote a price without an order book.",
    minutes: 4,
    body: [
      p("An automated market maker, or AMM, is a contract that holds two tokens and trades them against anyone who asks. There is no order book and no counterparty waiting on the other side. The price comes from the pool's own balances."),
      h2("Constant product"),
      p("The simplest design keeps the product of the two balances constant. Buy token B with token A and the pool's A balance goes up, its B balance goes down, and B gets more expensive. A large trade moves the price more than a small one; that movement is called price impact."),
      code("x * y = k"),
      h2("Concentrated liquidity"),
      p("Later designs let liquidity providers choose a price range. Inside that range their capital works much harder, so the same money gives deeper prices. Outside it, it earns nothing."),
      h2("Where hooks come in"),
      p("Uniswap v4 keeps concentrated liquidity and puts every pool in a single contract. It also lets each pool attach a hook: a contract that runs at fixed points of the pool's life. That is what makes rules like fees that change with size or burns on buys possible without a new AMM."),
    ],
  },
  {
    slug: "what-is-a-liquidity-provider",
    title: "What is a liquidity provider?",
    summary: "Who supplies the tokens a pool trades, and how they get paid.",
    minutes: 4,
    body: [
      p("A liquidity provider (LP) deposits both tokens of a pair into a pool. Every trade pays a fee, and that fee is shared among the LPs whose liquidity was in range when the trade happened."),
      h2("The trade-off"),
      p("As the price moves, an LP's position shifts toward the token that is falling. Compared with simply holding the two tokens, the LP can end up with less value. This is called divergence loss. Fees are what make up for it."),
      h2("Choosing a fee tier"),
      table(["Tier", "Usually for"], BASE_FEES.map((f) => [f.label, f.note])),
      h2("Rules that pay LPs more"),
      ul(
        "Size-Scaled Fee charges large trades more, and that fee goes to LPs.",
        "LP Stream sends a share of each buy straight to in-range liquidity.",
        "Snipe Guard's opening tax is donated to LPs too.",
      ),
    ],
  },
  {
    slug: "uniswap-v4-hooks",
    title: "Uniswap v4 hooks, explained",
    summary: "What a hook is, what it can do, and why its address matters.",
    minutes: 5,
    body: [
      p("A hook is a contract that a Uniswap v4 pool names when it is created. The pool's home contract, the PoolManager, calls the hook at chosen moments: before and after a swap, before and after liquidity changes, at creation and on donations."),
      h2("What hooks can do"),
      ul(
        "Set the fee for each swap instead of using a fixed tier.",
        "Refuse a trade, for example when a per-block cap is full.",
        "Take a share of what goes in or comes out, to burn it, donate it or hold it in a pot.",
        "Track positions for rewards, or lock liquidity until a date.",
      ),
      h2(`${FLAGS.length} switches in the address`),
      p("Which of these moments a hook is called at is not decided by its code but by its address. The last 14 bits of the address are switches. That means you can check a hook's powers without reading any code."),
      note("A hook is fixed for the life of a pool. Choose carefully, and read before you trade."),
    ],
  },
  {
    slug: "permission-bits-explained",
    title: "Permission bits, explained",
    summary: "Reading a hook's powers from its address in ten seconds.",
    minutes: 4,
    body: [
      p("Take any hook address and look at its last four hex characters. Those encode 14 bits, one per callback. A set bit means the PoolManager will call that function."),
      code(`address ...0x00C0  ->  bits 7 and 6  ->  beforeSwap + afterSwap`),
      h2("Which bits deserve attention"),
      table(
        ["Callback", "Why it matters"],
        FLAGS.filter((f) => f.weight >= 6).map((f) => [f.key, f.watch]),
      ),
      p("The [scanner](/scan) does this decoding for you and adds a risk read."),
    ],
  },
  {
    slug: "what-is-a-token-launchpad",
    title: "What is a token launchpad?",
    summary: "What launchpads standardise, and what a rule-based launch adds.",
    minutes: 4,
    body: [
      p("A launchpad turns creating a token into a form. It deploys the contract, sets the supply, opens a market and usually adds some opening rules. Its value is that every token launched through it behaves the same way, so buyers know what to expect."),
      h2("A pool-first launch"),
      p("Rule Craft starts from the pool. The token is created and its v4 pool opens in the same transaction, with the rules already attached. There is no separate curve to graduate from."),
      h2("What to check on any launch"),
      ol(
        "Is supply fixed, and who holds it at open?",
        "Is there an opening window, and what does it cost early buyers?",
        "Can the founding liquidity be withdrawn, and when?",
        "Can anyone change the rules afterwards?",
      ),
    ],
  },
  {
    slug: "anti-snipe-windows",
    title: "Anti-snipe windows",
    summary: "Why the first blocks of a market are dangerous and how a guard helps.",
    minutes: 3,
    body: [
      p("When a pool opens, bots watching the chain can buy in the very first block, before anyone else sees the pool. They then sell into the people who arrive later."),
      h2("How a guard window works"),
      p(`Snipe Guard limits how much all buyers together can take per block, as a share of supply (between ${bound(guard, "maxBuyPct").min}% and ${bound(guard, "maxBuyPct").max}%), and adds a tax of up to ${bound(guard, "guardTaxPct").max}% that goes to LPs. It lasts a fixed number of blocks (${bound(guard, "guardBlocks").min} to ${bound(guard, "guardBlocks").max}), then switches off for good.`),
      ul("A sniper can only take a small slice per block.", "Whatever they take costs them extra.", "Honest buyers pay the same tax, so short windows are kinder."),
    ],
  },
  {
    slug: "dynamic-fees",
    title: "Dynamic fees",
    summary: "Charging large trades more than small ones.",
    minutes: 3,
    body: [
      p("A fixed fee charges every trade the same share. But a large trade moves the price and costs LPs more. A dynamic fee can reflect that."),
      p(`Size-Scaled Fee starts at a floor (default ${bound(size, "minFeePct").def}%) and rises linearly to a ceiling (default ${bound(size, "maxFeePct").def}%) as the trade approaches a share of in-range liquidity (default ${bound(size, "depthPct").def}%). All of it goes to LPs.`),
      note("Routers that split large orders across pools usually end up paying close to the floor."),
    ],
  },
  {
    slug: "reading-a-pool-before-you-trade",
    title: "Reading a pool before you trade",
    summary: "The four questions to answer before your first swap.",
    minutes: 3,
    body: [
      ol(
        "Is this the right token? Check the address and chain, never the ticker.",
        "What can the hook do? Decode its permission bits.",
        "What does a buy cost me, now and after any opening window?",
        "Can the liquidity disappear?",
      ),
      p("On Rule Craft every pool page answers all four. For any other v4 pool, the [scanner](/scan) answers the second and gives a risk read."),
    ],
  },
];

export const learnBySlug = (slug: string) => LEARN.find((a) => a.slug === slug) ?? null;

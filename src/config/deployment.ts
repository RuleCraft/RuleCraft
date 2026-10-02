/*
 * Rule Craft contract addresses on Robinhood Chain mainnet. ONE place to change.
 *
 * Empty until the owner deploys from /deploy with their own wallet. Then paste the
 * four values the /deploy page prints, commit, and redeploy the site. While empty,
 * every on-chain action on the site says "Not deployed yet" and stays disabled.
 *
 * The contracts are unaudited.
 */
export const DEPLOYMENT = {
  registry: "",
  launcher: "",
  hook: "",
  /** Block of the registry deployment, for reference only. */
  deployBlock: 0,
};

/**
 * Local testing only (anvil fork). Built with NEXT_PUBLIC_RC_LOCAL_DEPLOY=1, the /deploy
 * page may store the addresses it deployed in this browser and the site uses them.
 * Never set for a public build: visitors could otherwise be pointed at other contracts.
 */
export const LOCAL_DEPLOY = process.env.NEXT_PUBLIC_RC_LOCAL_DEPLOY === "1";
export const LOCAL_DEPLOY_KEY = "rulecraft.localDeployment";

/** Uniswap's deterministic CREATE2 deployer (present on Robinhood Chain). The hook is deployed through it. */
export const CREATE2_DEPLOYER = "0x4e59b44847b379578588920cA78FbF26c0B4956C";

/** Permission bits the hook address must end in: beforeInitialize | beforeSwap | afterSwap | afterSwapReturnDelta. */
export const HOOK_FLAGS = 0x20c4;

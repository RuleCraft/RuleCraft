/*
 * Rule Craft contract addresses on Robinhood Chain mainnet. ONE place to change.
 *
 * Set from the values the /deploy page printed. If they are ever emptied, every
 * on-chain action on the site says "Not deployed yet" and stays disabled, and every
 * status text that reads IS_DEPLOYED follows.
 *
 * The contracts are unaudited.
 */
// Deployed by the owner from /deploy on 2 Oct 2026. Treasury 0xF6D090cbDe85b871cd89018269be00c9Ffb903Aa,
// protocol share 1000 bps (10%), both fixed for good. Verified on chain: code present, hook ends in 0x20C4,
// launcher.hook and hook.launcher point at each other, both use the v4 PoolManager.
export const DEPLOYMENT = {
  registry: "0xb48F36Da51717698844AFe187173373ee3A994FA",
  launcher: "0x0197B4018E04642e35372A55018838382b0b6aed",
  hook: "0x98E67cD59f8F885E68C06D48e432CC9a77d960c4",
  /** Block of the registry deployment, for reference only. */
  deployBlock: 78242394,
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

const isAddr = (v: string) => /^0x[0-9a-fA-F]{40}$/.test(v);

/** True when all three contract addresses are set. Status copy across the site reads this. */
export const IS_DEPLOYED = isAddr(DEPLOYMENT.registry) && isAddr(DEPLOYMENT.launcher) && isAddr(DEPLOYMENT.hook);

/** Date the owner deployed the contracts (shown in status copy). */
export const DEPLOYED_ON = "2026-10-02";

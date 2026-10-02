// Copies ABI + bytecode from contracts/out (forge build) into src/contracts/artifacts.json,
// so the site builds without Foundry. Run after `forge build` in contracts/.
import fs from "node:fs";
const out = new URL("../contracts/out/", import.meta.url);
const pick = (file, name, withBytecode) => {
  const j = JSON.parse(fs.readFileSync(new URL(`${file}/${name}.json`, out)));
  return withBytecode ? { abi: j.abi, bytecode: j.bytecode.object } : { abi: j.abi };
};
const artifacts = {
  BlueprintRegistry: pick("BlueprintRegistry.sol", "BlueprintRegistry", true),
  RuleCraftLauncher: pick("RuleCraftLauncher.sol", "RuleCraftLauncher", true),
  RuleCraftHook: pick("RuleCraftHook.sol", "RuleCraftHook", true),
  RuleCraftToken: pick("RuleCraftToken.sol", "RuleCraftToken", false),
};
fs.writeFileSync(new URL("../src/contracts/artifacts.json", import.meta.url), JSON.stringify(artifacts));
console.log("wrote", Object.keys(artifacts).join(", "));

/**
 * Live probe of the FAssets + FDC deployment on the connected network.
 * Run: npx hardhat run scripts/probe-fassets.ts --network coston2
 *
 * Prints every address the Wayafee app needs, resolved from the on-chain
 * FlareContractRegistry — never hardcoded from docs.
 */
import { ethers } from "hardhat";

// Same address on every Flare network.
const FLARE_CONTRACT_REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";

const REGISTRY_ABI = [
  "function getAllContracts() view returns (string[] names, address[] addresses)",
  "function getContractAddressByName(string name) view returns (address)",
];

const CONTROLLER_ABI = ["function getAssetManagers() view returns (address[])"];

const ASSET_MANAGER_ABI = [
  "function fAsset() view returns (address)",
  "function lotSize() view returns (uint256)",
  "function collateralReservationFee(uint256 lots) view returns (uint256)",
  "function getAvailableAgentsDetailedList(uint256 start, uint256 end) view returns (tuple(address agentVault, address ownerManagementAddress, uint256 feeBIPS, uint256 mintingVaultCollateralRatioBIPS, uint256 mintingPoolCollateralRatioBIPS, uint256 freeCollateralLots, uint256 status)[] agents, uint256 totalLength)",
];

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
];

async function main() {
  const provider = ethers.provider;
  const net = await provider.getNetwork();
  console.log(`network chainId=${net.chainId}`);

  const registry = new ethers.Contract(FLARE_CONTRACT_REGISTRY, REGISTRY_ABI, provider);
  const [names, addresses] = await registry.getAllContracts();

  const byName: Record<string, string> = {};
  for (let i = 0; i < names.length; i++) byName[names[i]] = addresses[i];

  const interesting = names.filter((n: string) =>
    /assetmanager|fdc|relay|ftso|xrp/i.test(n)
  );
  console.log("\nregistry entries of interest:");
  for (const n of interesting) console.log(`  ${n} = ${byName[n]}`);

  const controllerAddr = byName["AssetManagerController"];
  if (!controllerAddr) throw new Error("AssetManagerController not in registry");
  const controller = new ethers.Contract(controllerAddr, CONTROLLER_ABI, provider);
  const managers: string[] = await controller.getAssetManagers();
  console.log(`\nasset managers (${managers.length}):`);

  for (const m of managers) {
    const am = new ethers.Contract(m, ASSET_MANAGER_ABI, provider);
    try {
      const fAssetAddr = await am.fAsset();
      const fAsset = new ethers.Contract(fAssetAddr, ERC20_ABI, provider);
      const [symbol, name, decimals, lotSize, crf1] = await Promise.all([
        fAsset.symbol(),
        fAsset.name(),
        fAsset.decimals(),
        am.lotSize(),
        am.collateralReservationFee(1),
      ]);
      console.log(`\n  AssetManager ${m}`);
      console.log(`    fAsset: ${fAssetAddr} (${symbol} / ${name}, ${decimals} decimals)`);
      console.log(`    lotSize: ${lotSize} UBA`);
      console.log(`    collateralReservationFee(1 lot): ${ethers.formatEther(crf1)} native`);

      const { agents, totalLength } = await am.getAvailableAgentsDetailedList(0, 10);
      console.log(`    available agents: ${totalLength}`);
      for (const a of agents) {
        console.log(
          `      vault=${a.agentVault} feeBIPS=${a.feeBIPS} freeLots=${a.freeCollateralLots} status=${a.status}`
        );
      }
    } catch (e: any) {
      console.log(`  AssetManager ${m}: probe failed — ${e.message?.slice(0, 120)}`);
    }
  }

  console.log("\nFDC / system contracts:");
  for (const n of ["FdcHub", "FdcRequestFeeConfigurations", "FdcVerification", "Relay", "FlareSystemsManager", "WNat"]) {
    console.log(`  ${n} = ${byName[n] ?? "(not registered)"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

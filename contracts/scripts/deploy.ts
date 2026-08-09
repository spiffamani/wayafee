import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer account. Set DEPLOYER_PRIVATE_KEY in contracts/.env (a funded Coston2 key — faucet: https://faucet.flare.network/coston2)."
    );
  }
  console.log(`network: ${network.name}`);
  console.log(`deployer: ${deployer.address}`);
  console.log(`balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))}`);

  const splitRemit = await (await ethers.getContractFactory("SplitRemit")).deploy();
  await splitRemit.waitForDeployment();
  const address = await splitRemit.getAddress();

  console.log(`\nSplitRemit deployed: ${address}`);
  console.log(`\nNext step — point the app at it:`);
  console.log(`  echo "NEXT_PUBLIC_SPLITREMIT_ADDRESS=${address}" >> ../app/.env.local`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

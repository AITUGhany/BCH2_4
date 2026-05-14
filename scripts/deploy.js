const fs = require("fs");
const path = require("path");
const { ethers, network, run } = require("hardhat");

async function deployContract(name, args = []) {
  const contract = await ethers.deployContract(name, args);
  await contract.waitForDeployment();
  console.log(`${name}: ${await contract.getAddress()}`);
  return contract;
}

async function maybeVerify(address, constructorArguments) {
  if (!["sepolia"].includes(network.name)) return;
  try {
    await run("verify:verify", { address, constructorArguments });
  } catch (error) {
    console.warn(`Verification skipped/failed for ${address}: ${error.message}`);
  }
}

async function main() {
  const signers = await ethers.getSigners();
  const [deployer] = signers;
  const minDelay = 2 * 24 * 60 * 60;

  function resolveAddress(envName, localSignerIndex, fallbackToDeployer = false) {
    const value = process.env[envName];
    if (value && value.trim()) return ethers.getAddress(value.trim());
    if (["hardhat", "localhost"].includes(network.name) && signers[localSignerIndex]) {
      return signers[localSignerIndex].address;
    }
    if (fallbackToDeployer) return deployer.address;
    throw new Error(`${envName} is required for ${network.name} deployment`);
  }

  const teamBeneficiary = resolveAddress("TEAM_BENEFICIARY", 1);
  const communityAirdrop = resolveAddress("COMMUNITY_AIRDROP", 2);
  const liquidityAddress = resolveAddress("LIQUIDITY_ADDRESS", 3);
  const demoRecipient = resolveAddress("DEMO_RECIPIENT", 4, true);

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Team beneficiary: ${teamBeneficiary}`);
  console.log(`Community airdrop: ${communityAirdrop}`);
  console.log(`Liquidity address: ${liquidityAddress}`);

  const timelock = await deployContract("TimelockController", [minDelay, [], [], deployer.address]);
  const treasury = await deployContract("Treasury", [100]);
  const token = await deployContract("GovernanceToken", [
    teamBeneficiary,
    await treasury.getAddress(),
    communityAirdrop,
    liquidityAddress
  ]);

  const initialSupply = await token.INITIAL_SUPPLY();
  const proposalThreshold = initialSupply / 100n;
  const governor = await deployContract("MyGovernor", [
    await token.getAddress(),
    await timelock.getAddress(),
    proposalThreshold
  ]);
  const box = await deployContract("Box", []);

  await (await treasury.transferOwnership(await timelock.getAddress())).wait();
  await (await box.transferOwnership(await timelock.getAddress())).wait();

  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const cancellerRole = await timelock.CANCELLER_ROLE();
  const adminRole = await timelock.TIMELOCK_ADMIN_ROLE();
  const governorAddress = await governor.getAddress();

  await (await timelock.grantRole(proposerRole, governorAddress)).wait();
  await (await timelock.grantRole(executorRole, governorAddress)).wait();
  await (await timelock.grantRole(cancellerRole, governorAddress)).wait();
  await (await timelock.revokeRole(adminRole, deployer.address)).wait();

  const teamVesting = await token.teamVesting();

  const deployment = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    teamBeneficiary,
    communityAirdrop,
    liquidity: liquidityAddress,
    demoRecipient,
    minDelaySeconds: minDelay,
    votingDelayBlocks: Number(await governor.votingDelay()),
    votingPeriodBlocks: Number(await governor.votingPeriod()),
    proposalThreshold: proposalThreshold.toString(),
    quorumNumerator: Number(await governor.quorumNumerator()),
    contracts: {
      GovernanceToken: await token.getAddress(),
      TokenVesting: teamVesting,
      TimelockController: await timelock.getAddress(),
      MyGovernor: await governor.getAddress(),
      Treasury: await treasury.getAddress(),
      Box: await box.getAddress()
    }
  };

  fs.mkdirSync(path.join(__dirname, "..", "deployments"), { recursive: true });
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));

  const frontendConfig = {
    chainId: deployment.chainId,
    fromBlock: 0,
    contracts: deployment.contracts
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "frontend", "deployedAddresses.json"),
    JSON.stringify(frontendConfig, null, 2)
  );

  console.log(`Deployment saved to ${deploymentFile}`);

  await maybeVerify(await timelock.getAddress(), [minDelay, [], [], deployer.address]);
  await maybeVerify(await treasury.getAddress(), [100]);
  await maybeVerify(await token.getAddress(), [teamBeneficiary, await treasury.getAddress(), communityAirdrop, liquidityAddress]);
  await maybeVerify(await governor.getAddress(), [await token.getAddress(), await timelock.getAddress(), proposalThreshold]);
  await maybeVerify(await box.getAddress(), []);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

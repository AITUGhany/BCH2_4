const { ethers, network } = require("hardhat");

async function mineBlocks(count) {
  for (let i = 0; i < count; i += 1) {
    await network.provider.send("evm_mine");
  }
}

async function increaseTime(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

async function deploySystem() {
  const [deployer, team, community, liquidity, recipient] = await ethers.getSigners();
  const minDelay = 2 * 24 * 60 * 60;

  const Timelock = await ethers.getContractFactory("TimelockController");
  const timelock = await Timelock.deploy(minDelay, [], [], deployer.address);
  await timelock.waitForDeployment();

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(100);
  await treasury.waitForDeployment();

  const Token = await ethers.getContractFactory("GovernanceToken");
  const token = await Token.deploy(team.address, await treasury.getAddress(), community.address, liquidity.address);
  await token.waitForDeployment();

  const Governor = await ethers.getContractFactory("MyGovernor");
  const threshold = (await token.INITIAL_SUPPLY()) / 100n;
  const governor = await Governor.deploy(await token.getAddress(), await timelock.getAddress(), threshold);
  await governor.waitForDeployment();

  const Box = await ethers.getContractFactory("Box");
  const box = await Box.deploy();
  await box.waitForDeployment();

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

  return { deployer, team, community, liquidity, recipient, minDelay, token, timelock, governor, treasury, box };
}

async function runProposal(governor, proposer, target, encodedCall, description) {
  const tx = await governor.connect(proposer).propose([target], [0], [encodedCall], description);
  const receipt = await tx.wait();
  const event = receipt.logs.map((log) => {
    try { return governor.interface.parseLog(log); } catch { return null; }
  }).find((eventLog) => eventLog && eventLog.name === "ProposalCreated");
  const proposalId = event.args.proposalId;
  console.log(`ProposalCreated: ${proposalId.toString()}`);

  await mineBlocks(Number(await governor.votingDelay()) + 1);
  await (await governor.connect(proposer).castVoteWithReason(proposalId, 1, "For assignment demo")).wait();
  console.log("Vote cast: For");

  await mineBlocks(Number(await governor.votingPeriod()) + 1);
  console.log(`State after voting: ${await governor.state(proposalId)} (4 = Succeeded)`);

  const descriptionHash = ethers.id(description);
  await (await governor.queue([target], [0], [encodedCall], descriptionHash)).wait();
  console.log("Proposal queued");

  await increaseTime(2 * 24 * 60 * 60 + 1);
  await (await governor.execute([target], [0], [encodedCall], descriptionHash)).wait();
  console.log("Proposal executed");
}

async function main() {
  const { community, recipient, token, governor, treasury, box } = await deploySystem();

  await (await token.connect(community).delegate(community.address)).wait();
  await mineBlocks(1);
  console.log(`Community voting power: ${ethers.formatEther(await token.getVotes(community.address))} ADGT`);

  const boxCall = box.interface.encodeFunctionData("store", [42]);
  await runProposal(governor, community, await box.getAddress(), boxCall, "Proposal #1: Store 42 in Box");
  console.log(`Box value: ${await box.retrieve()}`);

  const amount = ethers.parseEther("1000");
  const transferCall = treasury.interface.encodeFunctionData("transferToken", [await token.getAddress(), recipient.address, amount]);
  await runProposal(governor, community, await treasury.getAddress(), transferCall, "Proposal #2: Transfer 1000 ADGT from treasury");
  console.log(`Recipient token balance: ${ethers.formatEther(await token.balanceOf(recipient.address))} ADGT`);

  const feeCall = treasury.interface.encodeFunctionData("setFeeBps", [250]);
  await runProposal(governor, community, await treasury.getAddress(), feeCall, "Proposal #3: Change treasury fee to 2.5 percent");
  console.log(`Treasury feeBps: ${await treasury.feeBps()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

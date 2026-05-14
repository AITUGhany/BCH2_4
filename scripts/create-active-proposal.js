const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function mineBlocks(count) {
  await network.provider.send("hardhat_mine", ["0x" + count.toString(16)]);
}

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const [, , community] = await ethers.getSigners();

  const token = await ethers.getContractAt("GovernanceToken", deployment.contracts.GovernanceToken);
  const governor = await ethers.getContractAt("MyGovernor", deployment.contracts.MyGovernor);
  const box = await ethers.getContractAt("Box", deployment.contracts.Box);

  await (await token.connect(community).delegate(community.address)).wait();
  await mineBlocks(1);

  const calldata = box.interface.encodeFunctionData("store", [42]);
  const description = "Frontend demo: Store 42 in Box";

  const tx = await governor.connect(community).propose(
    [await box.getAddress()],
    [0],
    [calldata],
    description
  );

  const receipt = await tx.wait();
  const event = receipt.logs
    .map((log) => {
      try {
        return governor.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "ProposalCreated");

  const proposalId = event.args.proposalId;

  await mineBlocks(Number(await governor.votingDelay()) + 1);

  console.log("Proposal ID:", proposalId.toString());
  console.log("State:", String(await governor.state(proposalId)), "(1 = Active)");
  console.log("Now open frontend and click Refresh proposals.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
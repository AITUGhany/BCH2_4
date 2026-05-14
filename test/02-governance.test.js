const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time, mine } = require("@nomicfoundation/hardhat-network-helpers");

const VOTE_AGAINST = 0;
const VOTE_FOR = 1;
const VOTE_ABSTAIN = 2;

const STATE_DEFEATED = 3n;
const STATE_SUCCEEDED = 4n;
const STATE_QUEUED = 5n;
const STATE_EXECUTED = 7n;

async function deployDaoFixture() {
  const [deployer, team, community, liquidity, recipient, smallVoter, outsider] = await ethers.getSigners();
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
  const proposalThreshold = (await token.INITIAL_SUPPLY()) / 100n;
  const governor = await Governor.deploy(await token.getAddress(), await timelock.getAddress(), proposalThreshold);
  await governor.waitForDeployment();

  const Box = await ethers.getContractFactory("Box");
  const box = await Box.deploy();
  await box.waitForDeployment();

  await treasury.transferOwnership(await timelock.getAddress());
  await box.transferOwnership(await timelock.getAddress());

  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const cancellerRole = await timelock.CANCELLER_ROLE();
  const adminRole = await timelock.TIMELOCK_ADMIN_ROLE();
  const governorAddress = await governor.getAddress();

  await timelock.grantRole(proposerRole, governorAddress);
  await timelock.grantRole(executorRole, governorAddress);
  await timelock.grantRole(cancellerRole, governorAddress);
  await timelock.revokeRole(adminRole, deployer.address);

  await token.connect(community).delegate(community.address);
  await mine(1);

  return {
    deployer,
    team,
    community,
    liquidity,
    recipient,
    smallVoter,
    outsider,
    minDelay,
    timelock,
    treasury,
    token,
    governor,
    box
  };
}

async function proposeSingle(governor, proposer, target, value, calldata, description) {
  const descriptionHash = ethers.id(description);
  await governor.connect(proposer).propose([target], [value], [calldata], description);
  const proposalId = await governor.hashProposal([target], [value], [calldata], descriptionHash);
  return { proposalId, descriptionHash };
}

async function passProposal({ governor, voter, proposalId }) {
  await mine(Number(await governor.votingDelay()) + 1);
  await governor.connect(voter).castVoteWithReason(proposalId, VOTE_FOR, "For");
  await mine(Number(await governor.votingPeriod()) + 1);
  expect(await governor.state(proposalId)).to.equal(STATE_SUCCEEDED);
}

async function queueAndExecute({ governor, timelockDelay, target, value, calldata, descriptionHash }) {
  await governor.queue([target], [value], [calldata], descriptionHash);
  const proposalId = await governor.hashProposal([target], [value], [calldata], descriptionHash);
  expect(await governor.state(proposalId)).to.equal(STATE_QUEUED);

  await time.increase(timelockDelay + 1);
  await governor.execute([target], [value], [calldata], descriptionHash);
  expect(await governor.state(proposalId)).to.equal(STATE_EXECUTED);
}

describe("MyGovernor, Timelock, Treasury and Box", function () {
  it("uses the required governor configuration", async function () {
    const { governor, token } = await loadFixture(deployDaoFixture);
    expect(await governor.votingDelay()).to.equal(7200n);
    expect(await governor.votingPeriod()).to.equal(50400n);
    expect(await governor.proposalThreshold()).to.equal((await token.INITIAL_SUPPLY()) / 100n);
    expect(await governor.quorumNumerator()).to.equal(4n);
  });

  it("assigns the Timelock as owner of Treasury and Box", async function () {
    const { timelock, treasury, box } = await loadFixture(deployDaoFixture);
    expect(await treasury.owner()).to.equal(await timelock.getAddress());
    expect(await box.owner()).to.equal(await timelock.getAddress());
  });

  it("makes Governor the sole proposer/executor/canceller and removes deployer admin", async function () {
    const { deployer, governor, timelock } = await loadFixture(deployDaoFixture);
    const governorAddress = await governor.getAddress();
    expect(await timelock.hasRole(await timelock.PROPOSER_ROLE(), governorAddress)).to.equal(true);
    expect(await timelock.hasRole(await timelock.EXECUTOR_ROLE(), governorAddress)).to.equal(true);
    expect(await timelock.hasRole(await timelock.CANCELLER_ROLE(), governorAddress)).to.equal(true);
    expect(await timelock.hasRole(await timelock.TIMELOCK_ADMIN_ROLE(), deployer.address)).to.equal(false);
  });

  it("prevents direct Box mutation outside governance", async function () {
    const { box, outsider } = await loadFixture(deployDaoFixture);
    await expect(box.connect(outsider).store(42)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("prevents direct Treasury token transfers outside governance", async function () {
    const { treasury, token, outsider, recipient } = await loadFixture(deployDaoFixture);
    await expect(
      treasury.connect(outsider).transferToken(token, recipient.address, ethers.parseEther("1"))
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("executes the full Box.store(42) proposal lifecycle", async function () {
    const { governor, community, box, minDelay } = await loadFixture(deployDaoFixture);
    const calldata = box.interface.encodeFunctionData("store", [42]);
    const description = "Proposal: store 42 in Box";

    const { proposalId, descriptionHash } = await proposeSingle(
      governor,
      community,
      await box.getAddress(),
      0,
      calldata,
      description
    );

    await passProposal({ governor, voter: community, proposalId });
    await queueAndExecute({
      governor,
      timelockDelay: minDelay,
      target: await box.getAddress(),
      value: 0,
      calldata,
      descriptionHash
    });

    expect(await box.retrieve()).to.equal(42n);
  });

  it("transfers DAO tokens from Treasury through governance", async function () {
    const { governor, community, treasury, token, recipient, minDelay } = await loadFixture(deployDaoFixture);
    const amount = ethers.parseEther("1000");
    const calldata = treasury.interface.encodeFunctionData("transferToken", [await token.getAddress(), recipient.address, amount]);
    const description = "Proposal: transfer 1000 ADGT to recipient";

    const { proposalId, descriptionHash } = await proposeSingle(
      governor,
      community,
      await treasury.getAddress(),
      0,
      calldata,
      description
    );

    await passProposal({ governor, voter: community, proposalId });
    await queueAndExecute({
      governor,
      timelockDelay: minDelay,
      target: await treasury.getAddress(),
      value: 0,
      calldata,
      descriptionHash
    });

    expect(await token.balanceOf(recipient.address)).to.equal(amount);
  });

  it("changes a Treasury parameter through governance", async function () {
    const { governor, community, treasury, minDelay } = await loadFixture(deployDaoFixture);
    const calldata = treasury.interface.encodeFunctionData("setFeeBps", [250]);
    const description = "Proposal: set feeBps to 250";

    const { proposalId, descriptionHash } = await proposeSingle(
      governor,
      community,
      await treasury.getAddress(),
      0,
      calldata,
      description
    );

    await passProposal({ governor, voter: community, proposalId });
    await queueAndExecute({
      governor,
      timelockDelay: minDelay,
      target: await treasury.getAddress(),
      value: 0,
      calldata,
      descriptionHash
    });

    expect(await treasury.feeBps()).to.equal(250n);
  });

  it("allows a delegatee to vote with delegated voting power", async function () {
    const { governor, token, community, liquidity, box } = await loadFixture(deployDaoFixture);
    const communityVotesBefore = await token.getVotes(community.address);

    await token.connect(liquidity).delegate(community.address);
    await mine(1);
    expect(await token.getVotes(community.address)).to.be.gt(communityVotesBefore);

    const calldata = box.interface.encodeFunctionData("store", [77]);
    const { proposalId } = await proposeSingle(
      governor,
      community,
      await box.getAddress(),
      0,
      calldata,
      "Proposal: delegatee voting power test"
    );

    await mine(Number(await governor.votingDelay()) + 1);
    await expect(governor.connect(community).castVote(proposalId, VOTE_FOR))
      .to.emit(governor, "VoteCast");
  });

  it("defeats a proposal when For votes lose to Against votes", async function () {
    const { governor, token, community, liquidity, box } = await loadFixture(deployDaoFixture);
    await token.connect(liquidity).delegate(liquidity.address);
    await mine(1);

    const calldata = box.interface.encodeFunctionData("store", [13]);
    const { proposalId } = await proposeSingle(
      governor,
      community,
      await box.getAddress(),
      0,
      calldata,
      "Proposal: defeated by against votes"
    );

    await mine(Number(await governor.votingDelay()) + 1);
    await governor.connect(community).castVote(proposalId, VOTE_AGAINST);
    await governor.connect(liquidity).castVote(proposalId, VOTE_FOR);
    await mine(Number(await governor.votingPeriod()) + 1);

    expect(await governor.state(proposalId)).to.equal(STATE_DEFEATED);
  });

  it("defeats a proposal when quorum is not met", async function () {
    const { governor, token, community, liquidity, smallVoter, box } = await loadFixture(deployDaoFixture);
    const smallAmount = ethers.parseEther("20000");
    await token.connect(liquidity).transfer(smallVoter.address, smallAmount);
    await token.connect(smallVoter).delegate(smallVoter.address);
    await mine(1);

    const calldata = box.interface.encodeFunctionData("store", [14]);
    const { proposalId } = await proposeSingle(
      governor,
      community,
      await box.getAddress(),
      0,
      calldata,
      "Proposal: quorum not met"
    );

    await mine(Number(await governor.votingDelay()) + 1);
    await governor.connect(smallVoter).castVote(proposalId, VOTE_FOR);
    await mine(Number(await governor.votingPeriod()) + 1);

    expect(await governor.state(proposalId)).to.equal(STATE_DEFEATED);
  });

  it("blocks proposal creation below the threshold", async function () {
    const { governor, outsider, box } = await loadFixture(deployDaoFixture);
    const calldata = box.interface.encodeFunctionData("store", [100]);

    await expect(
      governor.connect(outsider).propose(
        [await box.getAddress()],
        [0],
        [calldata],
        "Proposal: should fail threshold"
      )
    ).to.be.reverted;
  });

  it("does not allow queueing before voting has succeeded", async function () {
    const { governor, community, box } = await loadFixture(deployDaoFixture);
    const calldata = box.interface.encodeFunctionData("store", [55]);
    const description = "Proposal: queue too early";
    const { descriptionHash } = await proposeSingle(
      governor,
      community,
      await box.getAddress(),
      0,
      calldata,
      description
    );

    await expect(governor.queue([await box.getAddress()], [0], [calldata], descriptionHash)).to.be.reverted;
  });

  it("does not allow execution before the timelock delay", async function () {
    const { governor, community, box } = await loadFixture(deployDaoFixture);
    const calldata = box.interface.encodeFunctionData("store", [56]);
    const description = "Proposal: execute too early";
    const { proposalId, descriptionHash } = await proposeSingle(
      governor,
      community,
      await box.getAddress(),
      0,
      calldata,
      description
    );

    await passProposal({ governor, voter: community, proposalId });
    await governor.queue([await box.getAddress()], [0], [calldata], descriptionHash);

    await expect(governor.execute([await box.getAddress()], [0], [calldata], descriptionHash)).to.be.reverted;
  });
});

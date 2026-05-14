const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time, mine } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_YEAR = 365 * 24 * 60 * 60;

async function deployTokenFixture() {
  const [deployer, team, treasury, community, liquidity, spender] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("GovernanceToken");
  const token = await Token.deploy(team.address, treasury.address, community.address, liquidity.address);
  await token.waitForDeployment();

  const vesting = await ethers.getContractAt("TokenVesting", await token.teamVesting());
  return { deployer, team, treasury, community, liquidity, spender, token, vesting };
}

describe("GovernanceToken and TokenVesting", function () {
  it("mints the fixed initial supply", async function () {
    const { token } = await loadFixture(deployTokenFixture);
    expect(await token.totalSupply()).to.equal(await token.INITIAL_SUPPLY());
  });

  it("distributes 40/30/20/10 exactly", async function () {
    const { token, treasury, community, liquidity, vesting } = await loadFixture(deployTokenFixture);
    const supply = await token.INITIAL_SUPPLY();

    expect(await token.balanceOf(await vesting.getAddress())).to.equal((supply * 40n) / 100n);
    expect(await token.balanceOf(treasury.address)).to.equal((supply * 30n) / 100n);
    expect(await token.balanceOf(community.address)).to.equal((supply * 20n) / 100n);
    expect(await token.balanceOf(liquidity.address)).to.equal((supply * 10n) / 100n);
  });

  it("sets the correct team vesting beneficiary and duration", async function () {
    const { team, vesting } = await loadFixture(deployTokenFixture);
    expect(await vesting.beneficiary()).to.equal(team.address);
    expect(await vesting.durationSeconds()).to.equal(ONE_YEAR);
  });

  it("has no vested tokens before the vesting start", async function () {
    const { vesting } = await loadFixture(deployTokenFixture);
    const start = await vesting.startTimestamp();
    expect(await vesting.vestedAmount(start - 1n)).to.equal(0n);
  });

  it("vests roughly half of team tokens after six months", async function () {
    const { token, vesting } = await loadFixture(deployTokenFixture);
    const start = await vesting.startTimestamp();
    const teamAllocation = await token.balanceOf(await vesting.getAddress());
    const halfTime = start + BigInt(ONE_YEAR / 2);

    const vested = await vesting.vestedAmount(halfTime);
    expect(vested).to.equal(teamAllocation / 2n);
  });

  it("releases vested tokens to the team beneficiary", async function () {
    const { token, team, vesting } = await loadFixture(deployTokenFixture);
    await time.increase(ONE_YEAR / 2);

    await expect(vesting.release()).to.emit(vesting, "TokensReleased");
    expect(await token.balanceOf(team.address)).to.be.gt(0n);
    expect(await vesting.released()).to.equal(await token.balanceOf(team.address));
  });

  it("releases the remaining team allocation after the full vesting period", async function () {
    const { token, team, vesting } = await loadFixture(deployTokenFixture);
    const teamAllocation = (await token.INITIAL_SUPPLY()) * 40n / 100n;

    await time.increase(ONE_YEAR + 10);
    await vesting.release();

    expect(await token.balanceOf(team.address)).to.equal(teamAllocation);
    expect(await token.balanceOf(await vesting.getAddress())).to.equal(0n);
  });

  it("supports vote delegation", async function () {
    const { token, community } = await loadFixture(deployTokenFixture);
    expect(await token.getVotes(community.address)).to.equal(0n);

    await token.connect(community).delegate(community.address);
    expect(await token.delegates(community.address)).to.equal(community.address);
    expect(await token.getVotes(community.address)).to.equal(await token.balanceOf(community.address));
  });

  it("records voting power snapshots", async function () {
    const { token, community, liquidity } = await loadFixture(deployTokenFixture);
    await token.connect(community).delegate(community.address);
    await mine(1);
    const snapshotBlock = await ethers.provider.getBlockNumber();

    await token.connect(liquidity).transfer(community.address, ethers.parseEther("1000"));
    await mine(1);

    expect(await token.getPastVotes(community.address, snapshotBlock)).to.equal(ethers.parseEther("200000"));
    expect(await token.getVotes(community.address)).to.equal(ethers.parseEther("201000"));
  });

  it("supports EIP-2612 permit signatures", async function () {
    const { token, community, spender } = await loadFixture(deployTokenFixture);
    const tokenAddress = await token.getAddress();
    const value = ethers.parseEther("123");
    const nonce = await token.nonces(community.address);
    const deadline = BigInt(await time.latest()) + 3600n;
    const chainId = (await ethers.provider.getNetwork()).chainId;

    const signature = await community.signTypedData(
      {
        name: await token.name(),
        version: "1",
        chainId,
        verifyingContract: tokenAddress
      },
      {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      },
      {
        owner: community.address,
        spender: spender.address,
        value,
        nonce,
        deadline
      }
    );

    const { v, r, s } = ethers.Signature.from(signature);
    await token.permit(community.address, spender.address, value, deadline, v, r, s);

    expect(await token.allowance(community.address, spender.address)).to.equal(value);
    expect(await token.nonces(community.address)).to.equal(nonce + 1n);
  });
});

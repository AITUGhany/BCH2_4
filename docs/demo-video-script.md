# 10–15 Minute Demonstration Video Script

## 0:00–1:00 — Introduction

Hello, today I will demonstrate my DAO and on-chain governance system for Assignment 4. The system includes a governance token with vote delegation, a 12-month team vesting contract, an OpenZeppelin Governor, a TimelockController, a treasury, a controlled Box contract, a minimal governance frontend, tests, deployment scripts and audit documentation.

## 1:00–2:30 — Deployment and token distribution

Show:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Explain:

- `GovernanceToken` mints 1,000,000 ADGT.
- 40% goes to `TokenVesting` for the team.
- 30% goes to `Treasury`.
- 20% goes to community airdrop.
- 10% goes to liquidity.
- `Treasury` and `Box` ownership is transferred to the Timelock.
- Deployer admin role is revoked.

## 2:30–4:00 — Vote delegation

Show frontend:

- Connect wallet.
- Show token balance.
- Show voting power before delegation.
- Delegate votes.
- Show voting power after delegation.

Explain that ERC20Votes requires delegation before tokens count as voting power.

## 4:00–7:00 — Full proposal lifecycle

Show local demo script or frontend/Etherscan transactions:

```bash
npx hardhat run scripts/demo-local-lifecycle.js --network localhost
```

Explain lifecycle:

1. Propose `Box.store(42)`.
2. Wait voting delay.
3. Vote For.
4. Wait voting period.
5. Queue proposal in Timelock.
6. Wait 2-day Timelock delay.
7. Execute proposal.
8. Verify `Box.retrieve()` returns `42`.

## 7:00–9:00 — Treasury interaction through governance

Show proposal that calls:

```solidity
Treasury.transferToken(GovernanceToken, recipient, 1000 ether)
```

Explain that direct treasury transfer fails because only the Timelock owns the Treasury. The transfer succeeds only through governance.

## 9:00–10:30 — Parameter change proposal

Show proposal that calls:

```solidity
Treasury.setFeeBps(250)
```

Explain that this demonstrates changing a controlled contract parameter through governance.

## 10:30–12:00 — Frontend walkthrough

Show:

- Wallet connection.
- Token balance.
- Voting power.
- Delegate address.
- Proposal list.
- Cast vote buttons.
- Vote totals.

## 12:00–13:30 — Security audit findings

Summarize:

- Main risk is whale governance capture.
- Timelock gives an exit/review window.
- ERC20Votes snapshots reduce flash-loan voting attacks.
- Treasury and Box are owned by Timelock.
- Deployer admin role is revoked.
- Slither should be run before final submission.

## 13:30–15:00 — Gas summary and conclusion

Show gas report from:

```bash
REPORT_GAS=true npx hardhat test
```

Conclude that the DAO supports token deployment, delegation, proposal creation, voting, queuing, execution, treasury management and frontend voting.

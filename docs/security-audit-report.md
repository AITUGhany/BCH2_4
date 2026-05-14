# Security Audit Report — AITU DAO Governance System

## Scope

Audited files:

- `contracts/GovernanceToken.sol`
- `contracts/TokenVesting.sol`
- `contracts/MyGovernor.sol`
- `contracts/Treasury.sol`
- `contracts/Box.sol`

Main dependencies:

- OpenZeppelin Contracts `4.9.6`
- Hardhat
- Ethers.js v6

The system implements a standard token-weighted DAO: an ERC20Votes governance token, OpenZeppelin Governor, TimelockController, a treasury contract, and a controlled Box contract.

## Architecture summary

`GovernanceToken` mints a fixed supply of 1,000,000 ADGT. The initial distribution is 40% team, 30% treasury, 20% community airdrop and 10% liquidity. The team allocation is minted directly to a `TokenVesting` contract and is released linearly over 12 months.

`MyGovernor` is configured with a 1-day voting delay, a 1-week voting period, a 1% proposal threshold and 4% quorum. Successful proposals are queued and executed through `TimelockController`, which has a 2-day delay.

`Treasury` and `Box` are owned by the Timelock, not by the deployer. Therefore, normal users and the deployer cannot directly move treasury funds or call `Box.store()`. They must pass a governance proposal first.

## Static analysis plan

Run Slither before final submission:

```bash
pip install slither-analyzer
slither . --config-file slither.config.json
```

The raw output should be saved as `docs/slither-output.md`. The CI/local review should fail if Slither detects high or medium severity issues that are not intentionally accepted and documented.

## Manual findings

### Finding 1 — Token-weighted governance can be captured by a majority holder

Severity: High by governance impact, expected by design.

A token holder or coalition controlling more than 50% of active voting power can pass almost any proposal, including treasury transfers and parameter changes, as long as they satisfy quorum and Timelock execution rules. This is not a Solidity bug; it is a governance model risk.

Recommendation:

- Avoid giving one party a majority token allocation.
- Split treasury/community/liquidity allocations carefully.
- Use delegation monitoring.
- Consider adding guardian veto, optimistic governance challenge period, or super-quorum for critical actions.
- Consider longer Timelock delays for treasury-draining proposals.

### Finding 2 — Timelock delay is the main exit window

Severity: Medium.

The 2-day Timelock delay gives users time to review successful proposals before execution. However, if users do not monitor Timelock events, the delay alone does not protect the treasury.

Recommendation:

- Monitor `ProposalQueued`, `CallScheduled`, and `CallExecuted` events.
- Publish alerts for large treasury transfers and critical parameter changes.
- For production, consider using a longer delay for high-value treasury actions.

### Finding 3 — Team vesting contract cannot vote by itself

Severity: Low / governance design note.

Team tokens are locked in `TokenVesting`. The vesting contract does not delegate votes. This prevents locked team allocation from immediately dominating governance, but released tokens can be delegated by the team beneficiary after release.

Recommendation:

- Keep this behavior if the goal is reduced early team control.
- If the assignment requires vested-but-votable tokens, add a vesting contract function that can delegate only by beneficiary instruction.

### Finding 4 — Treasury has direct token/ETH transfer functions

Severity: Medium if owner is wrong, Low if Timelock ownership is correctly configured.

`Treasury.transferToken()` and `Treasury.transferETH()` are powerful functions. The design is safe only if `Treasury.owner()` is the Timelock.

Recommendation:

- Deployment script already transfers treasury ownership to Timelock.
- Add post-deployment verification to ensure deployer is not owner.
- Never deploy treasury and leave the deployer as owner.

### Finding 5 — Proposal threshold and quorum are based on total supply, not circulating supply

Severity: Low / governance design note.

Proposal threshold is 1% of total supply, and quorum is 4% of total supply. Because 40% of tokens are initially locked in vesting and 30% are in the treasury, early circulating voter participation may be lower than expected.

Recommendation:

- For production, consider dynamic quorum or supply definitions based on delegated/circulating supply.
- For the assignment, fixed total-supply settings match the stated requirements.

## Flash loan governance attack analysis

ERC20Votes uses historical voting power snapshots. A voter’s power for a proposal is measured at the proposal snapshot time, not at the execution time. This prevents a common flash-loan pattern where an attacker borrows governance tokens, votes, executes, and repays in the same transaction or block.

However, snapshots do not solve every governance attack. An attacker can still buy or borrow tokens before the snapshot, hold them through the voting delay/snapshot, vote, and later execute if the proposal passes. Timelock delay, voting delay, quorum, active monitoring and distribution design remain necessary.

## Centralization review

- Deployer admin role is revoked from Timelock in the deployment script.
- Governor is granted proposer, executor and canceller roles.
- Treasury and Box ownership are transferred to Timelock.
- The team allocation is locked in vesting.
- The community airdrop and liquidity addresses are externally provided; their security depends on the deployer’s correct address choices.

## Recommendations summary

1. Run Slither and save output before submission.
2. Verify contracts on Etherscan after Sepolia deployment.
3. Confirm Timelock roles and ownership after deployment.
4. Monitor all governance and treasury events.
5. Do not keep deployer admin privileges.
6. Do not store private keys in the repository.
7. Consider super-quorum or veto for critical treasury actions in a real production DAO.
8. Keep Timelock delay long enough for users to react.

## Conclusion

The implementation follows a standard OpenZeppelin Governor + ERC20Votes + Timelock architecture. The most important risks are not low-level Solidity bugs but governance risks: whale control, voter apathy, poor monitoring, and unsafe deployment permissions. If the post-deployment checklist is followed, the system satisfies the assignment’s security and production-readiness goals.

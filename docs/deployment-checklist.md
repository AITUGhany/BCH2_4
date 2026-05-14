# Production Deployment Checklist

## Pre-deployment

- Confirm `.env` contains only your own deployment wallet private key.
- Confirm deployer wallet has enough Sepolia ETH.
- Run `npm install`.
- Run `npx hardhat compile`.
- Run `npx hardhat test`.
- Run `slither . --config-file slither.config.json` and save output to `docs/slither-output.md`.
- Check constructor addresses: team beneficiary, community airdrop, liquidity address.
- Confirm `INITIAL_SUPPLY`, distribution percentages, voting delay, voting period, proposal threshold and quorum.

## Deployment order

1. Deploy `TimelockController` with a 2-day delay.
2. Deploy `Treasury`.
3. Deploy `GovernanceToken`, minting treasury allocation to `Treasury` and team allocation to `TokenVesting`.
4. Deploy `MyGovernor` with token, timelock and 1% proposal threshold.
5. Deploy `Box`.
6. Transfer `Treasury` ownership to `TimelockController`.
7. Transfer `Box` ownership to `TimelockController`.
8. Grant `PROPOSER_ROLE` to `MyGovernor`.
9. Grant `EXECUTOR_ROLE` to `MyGovernor`.
10. Grant `CANCELLER_ROLE` to `MyGovernor`.
11. Revoke `TIMELOCK_ADMIN_ROLE` from deployer.
12. Save deployment addresses to `deployments/sepolia.json` and `frontend/deployedAddresses.json`.

## Post-deployment verification

- `Treasury.owner()` equals Timelock address.
- `Box.owner()` equals Timelock address.
- Timelock `PROPOSER_ROLE` is held by Governor only.
- Timelock `EXECUTOR_ROLE` is held by Governor.
- Deployer no longer has `TIMELOCK_ADMIN_ROLE`.
- `Governor.votingDelay()` returns `7200`.
- `Governor.votingPeriod()` returns `50400`.
- `Governor.proposalThreshold()` returns `10,000 ADGT`.
- `Governor.quorumNumerator()` returns `4`.
- `Token.totalSupply()` returns `1,000,000 ADGT`.
- Treasury balance is `300,000 ADGT`.
- TokenVesting balance is `400,000 ADGT`.
- Frontend loads the deployed addresses and connects to the correct chain.

## Verified contract links

After Sepolia deployment, Hardhat verification prints Etherscan links. Put those links in the final report or LMS text field. Do not invent links before deployment.

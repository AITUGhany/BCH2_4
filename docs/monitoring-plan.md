# DAO Monitoring Plan

## Events to watch

- `ProposalCreated` from `MyGovernor` — new governance proposals.
- `VoteCast` and `VoteCastWithParams` from `MyGovernor` — voter participation and delegate activity.
- `ProposalQueued` from `MyGovernor` — successful proposals entering Timelock.
- `ProposalExecuted` from `MyGovernor` — executed governance actions.
- `CallScheduled`, `CallExecuted`, `Cancelled`, `MinDelayChange` from `TimelockController`.
- `DelegateChanged` and `DelegateVotesChanged` from `GovernanceToken`.
- `TokensReleased` from `TokenVesting`.
- `TokenTransferred`, `EthTransferred`, `FeeBpsChanged` from `Treasury`.
- `ValueStored` from `Box`.

## Metrics to track

- Number of active proposals.
- Voting turnout as a percent of total token supply.
- For/Against/Abstain distribution.
- Quorum margin before vote end.
- Large delegation changes.
- Treasury token and ETH balances.
- Timelock queued operations and ETA.
- Failed or cancelled proposals.
- Gas cost trends for propose/vote/queue/execute.

## Alerts

- Proposal created that transfers more than 10% of treasury assets.
- Proposal created that changes critical governance parameters.
- Sudden delegation change greater than 5% of total supply.
- Timelock operation scheduled with unexpected target address.
- Treasury balance drop after execution.
- Any deployer/admin address still having Timelock admin privileges after deployment.

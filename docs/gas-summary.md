# Gas Costs Summary

Run:

```bash
REPORT_GAS=true npx hardhat test
```

Recommended table for the final report:

| Action | Function | Approximate gas | Notes |
|---|---|---:|---|
| Deploy token | `GovernanceToken.constructor` | Fill from gas reporter | Includes internal `TokenVesting` deployment and initial minting |
| Deploy governor | `MyGovernor.constructor` | Fill from gas reporter | Governor modules + Timelock integration |
| Delegate | `delegate(address)` | Fill from gas reporter | Required before voting |
| Propose | `propose(...)` | Fill from gas reporter | Creates on-chain proposal |
| Vote | `castVote(...)` | Fill from gas reporter | Vote can be For/Against/Abstain |
| Queue | `queue(...)` | Fill from gas reporter | Schedules operation in Timelock |
| Execute | `execute(...)` | Fill from gas reporter | Executes after Timelock delay |
| Treasury transfer | `transferToken(...)` via Governor | Fill from gas reporter | Only callable through Timelock |

Gas values depend on compiler version, optimizer, network and calldata size, so the final report should use values from your own local run.

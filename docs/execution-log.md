# Step-by-step Governance Execution Log

Use this document while recording the screenshots/video.

## 1. Deploy contracts

Command:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Evidence to capture:

- Terminal output showing addresses.
- `deployments/sepolia.json` with contract addresses.
- Etherscan verified contract pages.

## 2. Delegate voting power

Command for local demo:

```bash
npx hardhat run scripts/demo-local-lifecycle.js --network localhost
```

Frontend path:

1. Connect MetaMask.
2. Check token balance.
3. Delegate to own wallet or another address.
4. Wait for delegation transaction confirmation.
5. Refresh voting power.

Screenshot needed:

- Wallet connected.
- Voting power shown after delegation.
- Successful delegation transaction in MetaMask/Etherscan.

## 3. Proposal lifecycle: Box.store(42)

Local script demonstrates:

1. `propose([Box], [0], [store(42)], description)`
2. Mine/pass voting delay.
3. `castVote(proposalId, For)`
4. Mine/pass voting period.
5. `queue(...)`
6. Increase time by 2-day Timelock delay.
7. `execute(...)`
8. Verify `Box.retrieve() == 42`.

Screenshots needed:

- Proposal created.
- Vote transaction.
- Proposal queued.
- Proposal executed.
- `Box.retrieve()` showing `42`.

## 4. Treasury token transfer proposal

The demo proposes and executes:

```solidity
Treasury.transferToken(GovernanceToken, recipient, 1000 ether)
```

Screenshots needed:

- Treasury token balance before.
- Proposal/vote/queue/execute.
- Recipient token balance after.

## 5. Parameter change proposal

The demo proposes and executes:

```solidity
Treasury.setFeeBps(250)
```

Screenshots needed:

- `feeBps` before.
- Executed governance transaction.
- `feeBps` after.

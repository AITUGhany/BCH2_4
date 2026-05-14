# Assignment 4

This is a complete Hardhat project for the Blockchain Technologies 2 Assignment 4: governance token, vesting, Governor, Timelock, Treasury, controlled Box contract, frontend, tests, deployment scripts, audit notes, research document and demo instructions.

## What is included

- `GovernanceToken.sol` — ERC20 + ERC20Permit + ERC20Votes with fixed 40/30/20/10 distribution.
- `TokenVesting.sol` — 12-month linear vesting contract for the team allocation.
- `MyGovernor.sol` — OpenZeppelin Governor with 1-day voting delay, 1-week voting period, 1% proposal threshold and 4% quorum.
- `Treasury.sol` — Timelock-owned treasury for ERC20/ETH transfers and DAO parameter changes.
- `Box.sol` — Timelock-owned controlled contract with `store(uint256)` and `retrieve()`.
- `test/` — 20+ tests covering token, vesting, permit, delegation, snapshots, proposal lifecycle, failures and Timelock execution.
- `scripts/deploy.js` — production-style deployment order with Timelock permissions.
- `scripts/demo-local-lifecycle.js` — local end-to-end demo: delegate, propose, vote, queue, execute.
- `frontend/` — minimal HTML/JS/Ethers.js governance interface.
- `docs/` — audit report, research document, execution guide, deployment checklist, gas summary and token distribution diagram.

## Quick start

```bash
npm install
npx hardhat compile
npx hardhat test
```

## Local demo

Terminal 1:

```bash
npx hardhat node
```

Terminal 2:

```bash
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/demo-local-lifecycle.js --network localhost
```

The deploy script writes:

- `deployments/localhost.json`
- `frontend/deployedAddresses.json`

## Frontend demo

After local deployment:

```bash
cd frontend
npx http-server -p 8080
```

Open `http://localhost:8080`, connect MetaMask to Localhost 8545, and import one of the Hardhat private keys from the local node output.

## Sepolia deployment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Fill these values:

```env
PRIVATE_KEY=0xyour_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

Deploy and verify:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## Slither audit

Install Slither locally:

```bash
pip install slither-analyzer
slither . --config-file slither.config.json
```

Copy the raw terminal output into `docs/slither-output.md` before final submission.

## Final ZIP checklist

Before uploading to LMS, delete `node_modules/`, `artifacts/`, `cache/`, `.env`, and any private keys. Keep source code, tests, docs, screenshots, deployment JSON and verified links.

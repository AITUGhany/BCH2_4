import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.5/+esm";

const tokenAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function getVotes(address) view returns (uint256)",
  "function delegates(address) view returns (address)",
  "function delegate(address) returns ()",
  "function symbol() view returns (string)"
];

const governorAbi = [
  "event ProposalCreated(uint256 proposalId,address proposer,address[] targets,uint256[] values,string[] signatures,bytes[] calldatas,uint256 voteStart,uint256 voteEnd,string description)",
  "function state(uint256 proposalId) view returns (uint8)",
  "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes,uint256 forVotes,uint256 abstainVotes)",
  "function castVote(uint256 proposalId,uint8 support) returns (uint256)",
  "function votingDelay() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function proposalThreshold() view returns (uint256)",
  "function quorum(uint256 blockNumber) view returns (uint256)"
];

const stateLabels = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
const voteLabels = ["Against", "For", "Abstain"];

let provider;
let signer;
let account;
let config;
let token;
let governor;
let tokenSymbol = "ADGT";

const $ = (id) => document.getElementById(id);

function log(message) {
  const stamp = new Date().toLocaleTimeString();
  $("log").textContent = `[${stamp}] ${message}\n` + $("log").textContent;
}

async function loadConfig() {
  try {
    const response = await fetch("deployedAddresses.json", { cache: "no-store" });
    if (!response.ok) throw new Error("deployedAddresses.json not found");
    return await response.json();
  } catch {
    const fallback = await fetch("deployedAddresses.example.json", { cache: "no-store" });
    const example = await fallback.json();
    log("Run deployment first. scripts/deploy.js will create frontend/deployedAddresses.json with real addresses.");
    return example;
  }
}

function assertReady() {
  if (!signer || !account) throw new Error("Connect wallet first");
  const zero = ethers.ZeroAddress.toLowerCase();
  if (config.contracts.GovernanceToken.toLowerCase() === zero || config.contracts.MyGovernor.toLowerCase() === zero) {
    throw new Error("Frontend config contains zero addresses. Deploy the contracts first.");
  }
}

async function refreshWallet() {
  assertReady();
  const [balance, votes, delegateAddress] = await Promise.all([
    token.balanceOf(account),
    token.getVotes(account),
    token.delegates(account)
  ]);

  $("account").textContent = account;
  $("balance").textContent = `${ethers.formatEther(balance)} ${tokenSymbol}`;
  $("votingPower").textContent = `${ethers.formatEther(votes)} ${tokenSymbol}`;
  $("delegate").textContent = delegateAddress;
}

async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask is not installed");
  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  account = await signer.getAddress();

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== Number(config.chainId)) {
    log(`Warning: connected chain ${network.chainId}, expected ${config.chainId}`);
  }

  token = new ethers.Contract(config.contracts.GovernanceToken, tokenAbi, signer);
  governor = new ethers.Contract(config.contracts.MyGovernor, governorAbi, signer);
  tokenSymbol = await token.symbol();

  await refreshWallet();
  await refreshProposals();
  log(`Connected ${account}`);
}

async function delegateVotes() {
  assertReady();
  const input = $("delegateInput").value.trim();
  const delegateTo = input || account;
  const tx = await token.delegate(delegateTo);
  log(`Delegation transaction sent: ${tx.hash}`);
  await tx.wait();
  log(`Delegated votes to ${delegateTo}`);
  await refreshWallet();
}

async function refreshProposals() {
  assertReady();
  const list = $("proposalList");
  list.innerHTML = "<p class='muted'>Loading proposals...</p>";

  const filter = governor.filters.ProposalCreated();
  const events = await governor.queryFilter(filter, config.fromBlock || 0, "latest");
  if (events.length === 0) {
    list.innerHTML = "<p class='muted'>No proposals found yet.</p>";
    return;
  }

  const cards = [];
  for (const event of events.reverse()) {
    const proposalId = event.args.proposalId;
    const description = event.args.description;
    const voteStart = event.args.voteStart;
    const voteEnd = event.args.voteEnd;
    const state = await governor.state(proposalId);
    const votes = await governor.proposalVotes(proposalId);

    cards.push(`
      <article class="proposal">
        <div class="row">
          <div>
            <span class="badge">${stateLabels[Number(state)]}</span>
            <h3>${escapeHtml(description)}</h3>
            <p class="muted small">ID: ${proposalId.toString()}</p>
            <p class="muted small">Voting blocks: ${voteStart.toString()} → ${voteEnd.toString()}</p>
            <p>For: ${ethers.formatEther(votes.forVotes)} | Against: ${ethers.formatEther(votes.againstVotes)} | Abstain: ${ethers.formatEther(votes.abstainVotes)}</p>
          </div>
          <div class="proposal-actions">
            <button class="danger" data-vote="0" data-id="${proposalId.toString()}">Against</button>
            <button class="ok" data-vote="1" data-id="${proposalId.toString()}">For</button>
            <button class="secondary" data-vote="2" data-id="${proposalId.toString()}">Abstain</button>
          </div>
        </div>
      </article>
    `);
  }

  list.innerHTML = cards.join("");
  list.querySelectorAll("button[data-vote]").forEach((button) => {
    button.addEventListener("click", () => castVote(button.dataset.id, Number(button.dataset.vote)));
  });
}

async function castVote(proposalId, support) {
  assertReady();
  const tx = await governor.castVote(proposalId, support);
  log(`Vote ${voteLabels[support]} sent: ${tx.hash}`);
  await tx.wait();
  log(`Vote confirmed for proposal ${proposalId}`);
  await refreshProposals();
  await refreshWallet();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.addEventListener("DOMContentLoaded", async () => {
  config = await loadConfig();
  $("connectBtn").addEventListener("click", () => connectWallet().catch((error) => log(error.message)));
  $("delegateBtn").addEventListener("click", () => delegateVotes().catch((error) => log(error.message)));
  $("refreshProposalsBtn").addEventListener("click", () => refreshProposals().catch((error) => log(error.message)));
});

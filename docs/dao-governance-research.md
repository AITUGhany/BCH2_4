# DAO Governance Research

## 1. Introduction

A decentralized autonomous organization (DAO) is a governance structure where decisions are made through rules encoded in smart contracts and voting mechanisms. In DeFi, DAOs usually control protocol parameters, treasuries, grants, upgrades and ecosystem incentives. The main promise is that protocol users and token holders can coordinate without relying on a traditional company board. The main weakness is that on-chain voting can reproduce old power problems: voter apathy, whale control, bribery, delegation capture and legal uncertainty.

This research compares governance models, reviews real DAO proposals, studies governance attacks, and summarizes legal and future governance trends.

## 2. Governance models

### Token-weighted voting

Token-weighted voting is the most common DAO model. Each token equals voting power. It is simple, transparent and easy to implement with contracts such as OpenZeppelin `ERC20Votes` and `Governor`. It also aligns financial exposure with decision power: users who hold more tokens have more at stake.

The weakness is plutocracy. A whale or coordinated group can dominate outcomes. If turnout is low, a small number of delegates can decide large treasury actions. Token voting also creates vote-buying and governance-mining incentives because votes are transferable through token markets.

Best use case: protocol parameter updates, treasury grants and systems where token ownership is intended to represent economic risk.

### Quadratic voting

Quadratic voting reduces whale dominance by making voting power grow with the square root of tokens or credits rather than linearly. For example, 100 voting credits give only 10 effective votes. This gives smaller holders a stronger relative voice.

The weakness is Sybil resistance. If one person can split tokens across many wallets, they can bypass the quadratic cost. Therefore, quadratic voting usually needs identity, reputation, proof-of-personhood or other anti-Sybil mechanisms.

Best use case: grants, public-goods funding and community preference signaling where broad participation matters more than pure capital weight.

### Conviction voting

Conviction voting measures support over time. The longer a voter continuously supports a proposal, the more conviction accumulates. This favors persistent preferences and reduces the power of sudden short-term mobilization.

The weakness is slower execution. It is less suitable for urgent security or emergency upgrades. It also needs careful parameter design because conviction thresholds can make governance either too rigid or too easy to manipulate.

Best use case: continuous funding streams, grants and ecosystem budgeting.

## 3. Real-world DAO proposal analysis

### Uniswap DAO — Protocol Fee Expansion Vote 1 and Vote 2

Uniswap governance has used token voting to make major protocol and treasury decisions. In 2026, Uniswap Agora listed executed protocol fee expansion votes. Vote 1 was executed on March 6, 2026 with about 62.84M UNI For and 4.97K UNI Against. Vote 2 was executed on March 7, 2026 with about 77.83M UNI For and 10.98 UNI Against.

What was proposed: expanding or enabling protocol fee-related governance actions.

Outcome: both votes were executed.

Interpretation: the huge For/Against gap shows strong delegate alignment for those proposals. However, token-denominated turnout still depends heavily on large delegates. This is efficient for execution but raises questions about whether smaller holders are meaningfully represented.

Source: https://vote.uniswapfoundation.org/

### Aave DAO — “Aave Will Win” proposal

Aave governance had a major 2026 dispute around protocol revenue and Aave Labs funding. The proposal known as “Aave Will Win” passed in April 2026. Public reporting described the result as a decisive vote with roughly 75% support, approving a large stablecoin grant and AAVE token vesting package for Aave Labs while redirecting application/product revenue toward AAVE token holders.

What was proposed: funding and incentive alignment for Aave Labs, plus revenue-control changes.

Outcome: passed.

Interpretation: the vote shows DAO governance can make high-value strategic decisions, not only small parameter changes. It also shows how conflicts between a DAO and core development company can become visible through governance.

Sources:

- https://unchainedcrypto.com/aave-dao-passes-aave-will-win-proposal-directing-100-of-product-revenue-to-token-holders-unchained/
- https://www.theblock.co/post/397138/aave-dao-approves-25-million-aave-labs-funding-grant-in-binding-aave-will-win-vote

## 4. Governance attacks

### Beanstalk governance attack

Beanstalk was attacked in April 2022. The attacker used a flash loan to gain enough governance power and push through malicious governance actions. Reports estimated around $181M-$182M in protocol assets were drained, with the attacker keeping about $76M-$80M as profit after repaying flash-loan debt and other operations.

What went wrong:

- Governance voting power could be acquired temporarily.
- The protocol lacked a sufficient execution delay.
- A malicious proposal could be executed before the community had time to react.

Prevention:

- Use voting snapshots.
- Use voting delay before proposal voting starts.
- Use Timelock delay before execution.
- Monitor queued proposals.
- Use quorum and proposal thresholds.
- Add emergency pause/guardian mechanisms for critical protocols.

Sources:

- https://medium.com/immunefi/hack-analysis-beanstalk-governance-attack-april-2022-f42788fc821e
- https://www.merklescience.com/blog/hack-track-analysis-of-beanstalk-flash-loan-attack

### Build Finance DAO hostile takeover

Build Finance DAO suffered a hostile governance takeover in February 2022. A malicious actor accumulated enough voting power to pass proposals that gave them control over the DAO’s token contract and treasury-related assets. Public reports estimated the loss at around $470,000.

What went wrong:

- Token voting allowed a determined actor to gain decisive power.
- Governance controls were not protected by stronger quorum, veto or timelock mechanisms.
- The system did not sufficiently account for hostile but formally valid proposals.

Prevention:

- Higher quorum for critical actions.
- Timelock execution delay.
- Emergency veto or security council for treasury-draining actions.
- Delegation and voting-power concentration monitoring.
- Separate permissions for treasury, token minting and governance parameter changes.

Sources:

- https://beosin.com/resources/beosin-analysis-build-finances-governance-takeover-incident
- https://www.theblock.co/post/134180/build-finance-dao-suffers-hostile-governance-takeover-loses-470000

## 5. Legal considerations

### Wyoming DAO LLC and DUNA

Wyoming has been one of the most DAO-friendly jurisdictions in the United States. Its DAO LLC model gives DAOs a legal wrapper based on limited liability company law. Wyoming also introduced a decentralized unincorporated nonprofit association framework, known as DUNA, which took effect in 2024 for qualifying DAO-style associations.

Legal wrappers can help DAOs sign contracts, limit member liability and interact with banks or service providers. However, they also introduce compliance duties and may reduce the “purely decentralized” nature of the DAO.

Sources:

- https://sos.wyo.gov/Forms/WyoBiz/DAO_Supplement.pdf
- https://blockworks.com/news/wyoming-non-profit-dao-legislation

### EU MiCA framework

The EU Markets in Crypto-Assets Regulation (MiCA) creates uniform rules for crypto-asset issuance and crypto-asset service providers. ESMA describes MiCA as covering crypto-assets not already regulated under existing financial-services law, with requirements around transparency, disclosure, authorization and supervision.

MiCA does not turn every DAO into a normal company automatically, but DAO projects that issue tokens, provide services, operate frontends, or involve identifiable service providers may face compliance obligations. A DAO with no legal wrapper can still have contributors, interfaces, token issuers or service providers that regulators may target.

Sources:

- https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica
- https://elvingerhoss.lu/insights/publications/mica-end-transitional-period-1-july-2026

## 6. Future of governance

### Optimistic governance

Optimistic governance assumes proposals pass unless challenged. This reduces voter fatigue and lets routine actions move faster. The risk is that malicious proposals can pass if nobody challenges them in time. It works best when paired with strong monitoring and challenge bonds.

### veToken models

Vote-escrowed token models lock tokens for voting power. Longer locks usually receive more influence. This can align long-term stakeholders but may also create governance cartels and bribery markets.

### Time-weighted voting

Time-weighted voting gives more influence to long-term holders or long-term delegates. It discourages short-term capture but reduces flexibility for new participants.

### Hybrid governance

Many DAOs are moving toward hybrid systems: token voting for legitimacy, delegates for expertise, security councils for emergencies, legal wrappers for contracts, and optimistic execution for routine actions. This is less ideologically pure but often more practical.

## 7. Conclusion

DAOs are not automatically democratic or safe. Token-weighted voting is easy to implement but vulnerable to whales and low turnout. Quadratic and conviction voting can improve representation but add complexity and Sybil risks. Real cases such as Uniswap and Aave show DAOs can coordinate major economic decisions. Attacks such as Beanstalk and Build Finance show that governance itself can be the attack surface.

A production DAO should combine snapshots, voting delays, quorum, Timelock execution, monitoring, careful token distribution and legal planning. The assignment implementation follows this practical model by using ERC20Votes snapshots, Governor voting rules, and Timelock-controlled execution.

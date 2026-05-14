// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TokenVesting.sol";

/// @title AITU DAO Governance Token
/// @notice ERC20Votes + ERC20Permit token with fixed initial DAO distribution.
contract GovernanceToken is ERC20, ERC20Permit, ERC20Votes {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 ether;
    uint256 public constant TEAM_PERCENT = 40;
    uint256 public constant TREASURY_PERCENT = 30;
    uint256 public constant COMMUNITY_PERCENT = 20;
    uint256 public constant LIQUIDITY_PERCENT = 10;
    uint64 public constant TEAM_VESTING_DURATION = 365 days;

    TokenVesting public immutable teamVesting;

    event InitialDistribution(
        address indexed teamVesting,
        address indexed treasury,
        address indexed communityAirdrop,
        address liquidity,
        uint256 teamAmount,
        uint256 treasuryAmount,
        uint256 communityAmount,
        uint256 liquidityAmount
    );

    constructor(
        address teamBeneficiary,
        address treasury,
        address communityAirdrop,
        address liquidity
    ) ERC20("AITU DAO Governance Token", "ADGT") ERC20Permit("AITU DAO Governance Token") {
        require(teamBeneficiary != address(0), "GovernanceToken: team beneficiary is zero");
        require(treasury != address(0), "GovernanceToken: treasury is zero");
        require(communityAirdrop != address(0), "GovernanceToken: community is zero");
        require(liquidity != address(0), "GovernanceToken: liquidity is zero");

        teamVesting = new TokenVesting(
            IERC20(address(this)),
            teamBeneficiary,
            uint64(block.timestamp),
            TEAM_VESTING_DURATION
        );

        uint256 teamAmount = (INITIAL_SUPPLY * TEAM_PERCENT) / 100;
        uint256 treasuryAmount = (INITIAL_SUPPLY * TREASURY_PERCENT) / 100;
        uint256 communityAmount = (INITIAL_SUPPLY * COMMUNITY_PERCENT) / 100;
        uint256 liquidityAmount = (INITIAL_SUPPLY * LIQUIDITY_PERCENT) / 100;

        _mint(address(teamVesting), teamAmount);
        _mint(treasury, treasuryAmount);
        _mint(communityAirdrop, communityAmount);
        _mint(liquidity, liquidityAmount);

        emit InitialDistribution(
            address(teamVesting),
            treasury,
            communityAirdrop,
            liquidity,
            teamAmount,
            treasuryAmount,
            communityAmount,
            liquidityAmount
        );
    }

    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }
}

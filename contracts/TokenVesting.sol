// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title TokenVesting
/// @notice Linear token vesting for the DAO team allocation.
/// @dev Tokens must be transferred to this contract after deployment or minted to it during token construction.
contract TokenVesting {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public immutable beneficiary;
    uint64 public immutable startTimestamp;
    uint64 public immutable durationSeconds;

    uint256 public released;

    event TokensReleased(address indexed beneficiary, uint256 amount);

    constructor(IERC20 token_, address beneficiary_, uint64 startTimestamp_, uint64 durationSeconds_) {
        require(address(token_) != address(0), "TokenVesting: token is zero");
        require(beneficiary_ != address(0), "TokenVesting: beneficiary is zero");
        require(durationSeconds_ > 0, "TokenVesting: duration is zero");

        token = token_;
        beneficiary = beneficiary_;
        startTimestamp = startTimestamp_;
        durationSeconds = durationSeconds_;
    }

    function releasable() external view returns (uint256) {
        return vestedAmount(uint64(block.timestamp)) - released;
    }

    function release() external returns (uint256 amount) {
        amount = vestedAmount(uint64(block.timestamp)) - released;
        require(amount > 0, "TokenVesting: nothing to release");

        released += amount;
        token.safeTransfer(beneficiary, amount);
        emit TokensReleased(beneficiary, amount);
    }

    function vestedAmount(uint64 timestamp) public view returns (uint256) {
        uint256 totalAllocation = token.balanceOf(address(this)) + released;

        if (timestamp < startTimestamp) {
            return 0;
        }

        uint64 elapsed = timestamp - startTimestamp;
        if (elapsed >= durationSeconds) {
            return totalAllocation;
        }

        return (totalAllocation * elapsed) / durationSeconds;
    }
}

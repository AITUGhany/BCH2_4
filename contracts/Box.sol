// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Box
/// @notice A simple Timelock-owned controlled contract used for governance execution demo.
contract Box is Ownable {
    uint256 private value;

    event ValueStored(uint256 indexed newValue);

    function store(uint256 newValue) external onlyOwner {
        value = newValue;
        emit ValueStored(newValue);
    }

    function retrieve() external view returns (uint256) {
        return value;
    }
}

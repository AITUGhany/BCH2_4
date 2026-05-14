// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title DAO Treasury
/// @notice Holds ETH and ERC20 assets. The owner must be the TimelockController.
contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_FEE_BPS = 1_000;
    uint256 public feeBps;

    event EthReceived(address indexed sender, uint256 amount);
    event EthTransferred(address indexed to, uint256 amount);
    event TokenTransferred(address indexed token, address indexed to, uint256 amount);
    event FeeBpsChanged(uint256 oldFeeBps, uint256 newFeeBps);

    constructor(uint256 initialFeeBps) {
        require(initialFeeBps <= MAX_FEE_BPS, "Treasury: fee too high");
        feeBps = initialFeeBps;
    }

    receive() external payable {
        emit EthReceived(msg.sender, msg.value);
    }

    function transferETH(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Treasury: recipient is zero");
        require(address(this).balance >= amount, "Treasury: insufficient ETH");

        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Treasury: ETH transfer failed");
        emit EthTransferred(to, amount);
    }

    function transferToken(IERC20 token, address to, uint256 amount) external onlyOwner {
        require(address(token) != address(0), "Treasury: token is zero");
        require(to != address(0), "Treasury: recipient is zero");

        token.safeTransfer(to, amount);
        emit TokenTransferred(address(token), to, amount);
    }

    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Treasury: fee too high");
        uint256 oldFeeBps = feeBps;
        feeBps = newFeeBps;
        emit FeeBpsChanged(oldFeeBps, newFeeBps);
    }
}

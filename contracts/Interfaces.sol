// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IUniSwapV2Router02 {
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

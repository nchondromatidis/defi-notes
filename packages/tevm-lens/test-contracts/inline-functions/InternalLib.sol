// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library InternalLib {
    function internalAddOperation(uint256 value1, uint256 value2) internal  pure returns (uint256) {
        return value1 + value2;
    }
}

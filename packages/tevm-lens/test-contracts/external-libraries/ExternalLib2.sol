// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library ExternalLib2 {
    function externalPureOperation(uint256 value1, uint256 value2) public pure returns (uint256) {
        return value1 + value2;
    }

}

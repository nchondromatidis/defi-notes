// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './free-functions.sol';
import './InternalLib.sol';


contract CallerContract1 {
    function op1(uint256 value1, uint256 value2) public returns (uint256) {
        return multiply(value1, value2);
    }

    function op2(uint256 value1, uint256 value2) public returns (uint256) {
        return add(value1, value2);
    }
}


contract CallerContract2 {
    function op1(uint256 value1, uint256 value2) public pure returns (uint256) {
        return add(value1, value2) + InternalLib.internalAddOperation(value1, value2);
    }
}
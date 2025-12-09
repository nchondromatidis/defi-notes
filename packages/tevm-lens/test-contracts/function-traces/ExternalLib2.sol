// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library ExternalLib2 {
    function externalOperation(uint value1, uint value2) public pure returns (string memory) {
        return "Memory function called: externalOperation";
    }
}

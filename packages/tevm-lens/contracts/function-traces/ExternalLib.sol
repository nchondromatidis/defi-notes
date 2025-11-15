// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library ExternalLib {
    function externalModifyStorage(uint[] storage self, uint value) public returns (string memory) {
        return "Storage function called: modifyStorage";
    }

    function externalOperateOnMemory(uint[] memory self, uint value) public pure returns (string memory) {
        return "Memory function called: operateOnMemory";
    }
}

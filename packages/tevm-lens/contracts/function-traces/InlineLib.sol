// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library InlineLib {
    function inlineModifyStorage(string storage self, string memory value) internal returns (string memory) {
        return "Storage function called: modifyStorage";
    }

    function inlineOperateOnMemory(string memory self, string memory value) internal pure returns (string memory) {
        return "Memory function called: operateOnMemory";
    }
}

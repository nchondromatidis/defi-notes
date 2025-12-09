// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CallerContract.sol";

library ExternalLib {
    event LibLog(address why, uint256 value);

    function externalModifyStorage(uint[] storage self, uint value) public returns (string memory) {
        emit LibLog(msg.sender, 0);
        return "Storage function called: modifyStorage";
    }

    function externalOperateOnMemory(uint[] memory self, uint value) public returns (string memory) {
        emit LibLog(msg.sender, 1);
        return "Memory function called: operateOnMemory";
    }

    struct InnerStruct {
        address a;
        uint256 b;
    }
    struct OuterStruct {
        InnerStruct st2;
        uint256[] c;
        bytes[3] d;
    }

    function externalModifyStorage2(OuterStruct storage outerStruct) public returns (string memory) {
        emit LibLog(msg.sender, 2);
        return "Storage function called: externalModifyStorage2";
    }
}

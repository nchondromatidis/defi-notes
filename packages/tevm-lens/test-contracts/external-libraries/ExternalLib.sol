// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CallerContract.sol";
import "./ImportedLib.sol";

library ExternalLib {
    event LibLog(address who, uint256 value);

    function externalModifyStorage(uint[] storage self, uint256 value) public returns (string memory) {
        emit LibLog(msg.sender, 0);
        return "Storage function called: modifyStorage";
    }

    function externalMemoryOperation(uint[] memory self, uint value) public returns (string memory) {
        emit LibLog(msg.sender, 1);
        return "Memory function called: operateOnMemory";
    }

    function externalModifyStorage2(ImportedLib.OuterStruct storage outerStruct) public returns (ImportedLib.ReturnStruct memory) {
        emit LibLog(msg.sender, 2);
        ImportedLib.ReturnStruct memory ret = ImportedLib.ReturnStruct(43, ImportedLib.Status.Approved);
        return ret;
    }

    function externalPureMemoryOperation(ImportedLib.OuterStruct memory outerStruct, uint256 value2) public pure returns (ImportedLib.Price) {
        return ImportedLib.Price.wrap(value2 * 2);
    }

    function externalPureStorageOperation(uint256[] storage value1, uint256 value2) public view returns (uint256) {
        return value1[0] + value2;
    }

    function externalModifyStorage3(uint[] storage self, uint[] storage value) public returns (string memory) {
        emit LibLog(msg.sender, 0);
        return "Storage function called: modifyStorage";
    }
}

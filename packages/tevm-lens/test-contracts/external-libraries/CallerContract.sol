// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ExternalLib.sol";
import "./ExternalLib2.sol";
import "./ImportedLib.sol";

contract CallerContract {
    event Log(string message, uint256 value);

    constructor() {}

    using ExternalLib for uint[];
    uint public a;
    uint[] public storageData1;


    mapping(uint256 => ImportedLib.OuterStruct) public outerStructMap;


    function testExternalLibCall1() public {
        uint[] memory mem = new uint[](2);
        mem[0] = 1;
        mem[1] = 2;
        mem.externalMemoryOperation(0);
        ExternalLib2.externalPureOperation(2, 5);
        emit Log("testExternalLibCall1 executed", 0);
    }

    function testExternalLibCall2() public {
        storageData1.push(1);
        storageData1.push(2);
        storageData1.externalModifyStorage(0);
        storageData1.externalModifyStorage3(storageData1);
        emit Log("testExternalLibCall2 executed", 0);
    }

    function testExternalLibCall3() public {
        ImportedLib.InnerStruct memory innerStruct = ImportedLib.InnerStruct(0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db,3);
        uint256[] memory c = new uint256[](2);
        c[0] = 1;
        c[1] = 3;
        bytes[3] memory d;
        d[0] = hex"01";
        d[1] = hex"0203";
        d[2] = hex"040506";
        ImportedLib.OuterStruct memory outerStruct = ImportedLib.OuterStruct(innerStruct, c,d);

        outerStructMap[1] = outerStruct;

        ExternalLib.externalModifyStorage2(outerStructMap[1]);
        emit Log("testExternalLibCall3 executed", 0);
    }

}

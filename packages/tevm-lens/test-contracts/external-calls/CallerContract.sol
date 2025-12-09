// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CalleeContract.sol";

contract CallerContract {
    event Log(string message, uint256 value);

    CalleeContract public callee;

    constructor(address payable _calleeAddress) {
        callee = CalleeContract(_calleeAddress);
        emit Log("CallerContract deployed", 0);
    }

    function callPublicFunction() public returns (CalleeContract.DummyStruct memory) {
        return callee.publicFunction();
    }

    function callExternalFunction(uint256[] memory numbers, address target) public returns (string memory) {
        return callee.externalFunction('called by caller');
    }

    function callStaticCallViewFunction() public returns (bool, bytes memory) {
        (bool success, bytes memory result) = address(callee).staticcall(abi.encodeWithSignature("viewFunction()"));
        emit Log("callStaticCallViewFunction executed", 0);
        return (success, result);
    }

    function callWithFallback(bytes memory _ignoredCalldata) public payable returns (bool, bytes memory) {
        (bool success, bytes memory result) = address(callee).call{value: msg.value}("0x1");
        emit Log("callWithFallback executed", msg.value);
        return (success, result);
    }

    function callReceiveFunction() public payable returns (bool, bytes memory) {
        (bool success, bytes memory result) = address(callee).call{value: msg.value}("");
        emit Log("callReceiveFunction executed", msg.value);
        return (success, result);
    }

    function callRevert() public {
        callee.revertFunction(msg.sender);
    }

}

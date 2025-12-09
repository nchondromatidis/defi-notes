// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../create-functions/CalleeContract.sol";

contract CallerContract {
    event Log(string message, uint256 value);

    CalleeContract public callee;

    constructor(address payable _calleeAddress) {
        callee = CalleeContract(_calleeAddress);
        emit Log("CallerContract deployed", 0);
    }

    function callDelegateCall(bytes memory _calldata) public returns (bool, bytes memory) {
        (bool success, bytes memory result) = address(callee).delegatecall(_calldata);
        emit Log("callDelegateCall executed", 0);
        return (success, result);
    }

}

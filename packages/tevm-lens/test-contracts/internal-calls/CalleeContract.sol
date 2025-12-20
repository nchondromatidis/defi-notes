// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CalleeContract {
    event Log(address indexed, string message, uint256 value);

    constructor() {}

    function callInternalAndPrivate2() public returns (uint256) {
        uint256 a = internalFunction2(2);
        uint256 b = privateFunction2(4);
        emit Log(address(msg.sender), "callInternalAndPrivate2 called", 1);
        return a + b;
    }

    function internalFunction2(uint256 input) internal returns (uint256) {
        emit Log(address(msg.sender), "internalFunction2 called", 2);
        return input;
    }

    function privateFunction2(uint256 input) private returns (uint256) {
        emit Log(address(msg.sender), "privateFunction2 called", 3);
        return input;
    }

    fallback(bytes calldata input) external payable returns (bytes memory output){
        emit Log(address(msg.sender),"Fallback function called", msg.value);
        return input;
    }
}

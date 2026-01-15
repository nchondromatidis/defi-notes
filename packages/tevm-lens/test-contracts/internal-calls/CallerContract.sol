// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CalleeContract.sol";

contract CallerContract {
    event Log(string message, uint256 value);

    CalleeContract public callee;

    constructor(address payable _calleeAddress) {
        callee = CalleeContract(_calleeAddress);
    }

    function mixedCall(uint256 input) external returns (uint256){
        uint256 a = internalFunction(input);
        uint256 b = privateFunction(input);
        internalFunction2();
        uint256 c = publicFunction(input);
        uint256 d = this.publicFunction(input);
        uint256 e = publicFunction(input);
        return a + c + d + e;
    }

    function internalFunction(uint256 input) internal returns (uint256) {
        uint256 result = privateFunction(input);
        emit Log("internalFunction called", 0);
        return result + input;
    }

    function internalFunction2() internal view {
        require(address(callee) != address(0));
    }

    function privateFunction(uint256 input) private returns (uint256) {
        emit Log("privateFunction called", 0);
        return input;
    }

    function publicFunction(uint256 input) public returns (uint256) {
        uint256 a = internalFunction(input);
        return a + 3;
    }

    function callAnotherContract() public returns (uint256) {
        uint256 a = callee.callInternalAndPrivate2();
        emit Log("callAnotherContract called", 0);
        return a;
    }

    function callAnotherContractWithFallback(uint256 input) public returns (uint256){
        (bool success, bytes memory result) = address(callee).call("0x1");
        uint256 a = publicFunction(input);
        emit Log("callAnotherContractWithFallback executed", a);
        return a;
    }
}

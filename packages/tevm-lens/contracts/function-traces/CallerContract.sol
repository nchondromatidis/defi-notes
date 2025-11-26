// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CalleeContract.sol";
import "./CalleeContract2.sol";
import "./ExternalLib.sol";
import "./ExternalLib2.sol";
import "./InlineLib.sol";

contract CallerContract {
    event Log(string message, uint256 value);

    CalleeContract public callee;

    constructor(address payable _calleeAddress) {
        callee = CalleeContract(_calleeAddress);
        emit Log("CallerContract deployed", 0);
    }

    // deploy contract

    function deployContract() public {
        new CalleeContract2(4);
    }

    function create2Contract(bytes32 salt) public {
        new CalleeContract2{salt: salt}(6);
    }

    //  function calls to another contract

    function callPublicFunction() public returns (CalleeContract.DummyStruct memory) {
        return callee.publicFunction();
    }

    function callExternalFunction() public returns (string memory) {
        return callee.externalFunction();
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

    function callDelegateCall(bytes memory _calldata) public returns (bool, bytes memory) {
        (bool success, bytes memory result) = address(callee).delegatecall(_calldata);
        emit Log("callDelegateCall executed", 0);
        return (success, result);
    }

    function callStaticCallViewFunction() public returns (bool, bytes memory) {
        (bool success, bytes memory result) = address(callee).staticcall(abi.encodeWithSignature("viewFunction()"));
        emit Log("callStaticCallViewFunction executed", 0);
        return (success, result);
    }

    // function calls to external library

    using ExternalLib for uint[];
    uint[] public storageData1;


    function testExternalLibCall() public {
        storageData1.externalModifyStorage(0);
        uint[] memory mem = new uint[](1);
        mem.externalOperateOnMemory(0);
    }

    function testExternalLibCall2() public {
        ExternalLib2.externalOperation(2, 5);
    }

    // function calls to inline library

    using InlineLib for string;
    string public internalLibData;

    function testInlineLibCall() public {
        internalLibData.inlineModifyStorage("");
        string memory mem = "";
        mem.inlineOperateOnMemory("");
    }

    // function calls to same contract

    function callPublicAndExternal() public returns (string memory) {
        viewFunctionPublic();
        this.viewFunctionExternal();
        emit Log("callPublicAndExternal called", 0);
        return "public and external called";
    }

    function viewFunctionPublic() public view returns (uint256) {
        return 0;
    }

    function viewFunctionExternal() external view returns (uint256) {
        return 0;
    }

    function callInternalAndPrivate() public returns (string memory) {
        internalFunction();
        privateFunction();
        emit Log("callInternalAndPrivate called", 0);
        return "internal and private called";
    }

    function internalFunction() internal returns (string memory) {
        emit Log("internalFunction called", 0);
        return "internalFunction called";
    }

    function privateFunction() private returns (string memory) {
        emit Log("privateFunction called", 0);
        return "privateFunction called";
    }
}

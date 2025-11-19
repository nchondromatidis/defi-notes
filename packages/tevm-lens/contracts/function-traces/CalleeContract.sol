// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CalleeContract {
    struct DummyStruct {
        uint256 id;
        string name;
    }
    event Log(address indexed, string message, uint256 value);

    constructor() {
        emit Log(address(msg.sender), "CalleeContract deployed", 0);
    }

    function publicFunction() public returns (DummyStruct memory) {
        emit Log(address(msg.sender),"publicFunction called", 0);
        return DummyStruct(1, "dummy");
    }

    function externalFunction() external returns (string memory) {
        emit Log(address(msg.sender), "externalFunction called", 0);
        return "externalFunction called";
    }

    function viewFunction() public view returns (uint256) {
        return 0;
    }

    receive() external payable {
        emit Log(address(msg.sender), "Receive function called", msg.value);
    }

    fallback(bytes calldata input) external payable returns (bytes memory output){
        emit Log(address(msg.sender),"Fallback function called", msg.value);
        return input;
    }
}

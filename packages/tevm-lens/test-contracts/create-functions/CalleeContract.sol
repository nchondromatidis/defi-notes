// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CalleeContract {
    event Log(string message, uint256 value);

    constructor(uint256 constructorArg) {
        emit Log("CalleeContract deployed", 0);
    }

}

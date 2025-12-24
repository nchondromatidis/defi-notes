// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../_interface/ITrace.sol";

contract D is ITrace {
    uint256 public  d;

    constructor(uint256 init) {
        emit Hit("D", "constructor");
        d = init;
    }

    function ping() public virtual returns (string memory) {
        emit Hit("D", "ping");
        return _internal1();
    }

    function _internal1() internal virtual returns (string memory) {
        _internal2();
        emit Hit("D", "_internal1");
        return "D._internal1";
    }

    function _internal2() internal virtual returns (string memory) {
        emit Hit("D", "_internal2");
        return "D._internal2";
    }
}

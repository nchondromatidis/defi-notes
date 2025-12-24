// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../_interface/ITrace.sol";

contract F is ITrace {
    uint256 public f;

    constructor(uint256 init) {
        emit Hit("F", "constructor");
        f = init;
    }

    function ping() public virtual returns (string memory) {
        emit Hit("F", "ping");
        return _internal1();
    }

    function ping2() public virtual returns (string memory) {
        emit Hit("F", "ping2");
        return _internal1();
    }

    function _internal1() internal virtual returns (string memory) {
        _internal2();
        emit Hit("F", "_internal1");
        return "F._internal1";
    }

    function _internal2() internal virtual returns (string memory) {
        emit Hit("F", "_internal2");
        return "F._internal2";
    }
}

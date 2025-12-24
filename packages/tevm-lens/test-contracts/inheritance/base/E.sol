// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../_interface/ITrace.sol";

contract E is ITrace {
    uint256 public e;

    constructor() {
        emit Hit("E", "constructor");
        e = 0;
    }

    function ping() public virtual returns (string memory) {
        emit Hit("E", "ping");
        return "E.ping";
    }
}

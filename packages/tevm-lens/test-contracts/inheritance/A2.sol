// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./mid/C_EF.sol";
import "./mid/B_DE.sol";

// A2 -> B_DE -> C_EF -> F -> E -> D -> I
contract A2 is C_EF, B_DE {
    uint256 public a2;

    constructor(uint256 init) C_EF(init) B_DE(init) {
        emit Hit("A2", "constructor");
        a2 = init;
    }

    function ping() public override(C_EF, B_DE) returns (string memory) {
        super.ping();
        emit Hit("A2", "ping");
        return _internal1();
    }

    function _internal1() internal virtual override(D, F) returns (string memory) {
        _internal2();
        emit Hit("A2", "_internal1");
        return "A2._internal1";
    }

    function _internal2() internal virtual override(D, F) returns (string memory) {
        emit Hit("A2", "_internal2");
        return "A2._internal2";
    }
}

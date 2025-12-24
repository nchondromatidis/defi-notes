// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./mid/C_FE.sol";
import "./mid/B_ED.sol";

// A -> B_ED -> D -> C_FE -> E -> F -> I
contract A is C_FE, B_ED {
    uint256 public a;

    constructor(uint256 init) C_FE(init) B_ED(init) {
        emit Hit("A", "constructor");
        a = init;
    }

    function ping() public override(C_FE, B_ED) returns (string memory) {
        super.ping();
        emit Hit("A", "ping");
        return _internal1();
    }

    function _internal1() internal virtual override(D, F) returns (string memory) {
        _internal2();
        emit Hit("A", "_internal1");
        return "A._internal1";
    }

    function _internal2() internal virtual override(D, F) returns (string memory) {
        emit Hit("A", "_internal2");
        return "A._internal2";
    }
}

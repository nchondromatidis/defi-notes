// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../base/E.sol";
import "../base/D.sol";

contract B_ED is E, D {
    uint256 public b_ed;

    constructor(uint256 init) D(init) {
        emit Hit("B_ED", "constructor");
        b_ed = init;
    }

    function ping() public virtual override(E, D) returns (string memory) {
        string memory pingReturn = super.ping();
        emit Hit("B_ED", "ping");
        return pingReturn;
    }

}

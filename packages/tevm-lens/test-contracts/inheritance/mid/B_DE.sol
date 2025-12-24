// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../base/D.sol";
import "../base/E.sol";

contract B_DE is D, E {
    uint256 public  b_de;

    constructor(uint256 init) D(init) {
        emit Hit("B_DE", "constructor");
        b_de = init;
    }

    function ping() public virtual override(D, E) returns (string memory) {
        string memory pingReturn = super.ping();
        emit Hit("B_DE", "ping");
        return pingReturn;
    }

}

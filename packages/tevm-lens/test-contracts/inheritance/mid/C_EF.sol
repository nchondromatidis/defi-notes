// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../base/E.sol";
import "../base/F.sol";

contract C_EF is E, F {
    uint256 public c_ef;

    constructor(uint256 init) F(init){
        emit Hit("C_EF", "constructor");
        c_ef = init;
    }

    function ping() public virtual override(E, F) returns (string memory) {
        string memory pingReturn = super.ping();
        emit Hit("C_EF", "ping");
        return pingReturn;
    }

}

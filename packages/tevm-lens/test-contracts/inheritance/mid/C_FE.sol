// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../base/F.sol";
import "../base/E.sol";

contract C_FE is F, E {
    uint256 public c_fe;

    constructor(uint256 init) F(init) {
        emit Hit("C_FE", "constructor");
        c_fe = init;
    }

    // Demonstrate super-chain inside this branch
    function ping() public virtual override(F, E) returns (string memory) {
        string memory pingReturn =  super.ping();
        emit Hit("C_FE", "ping");
        return pingReturn;
    }

}

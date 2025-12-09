// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CalleeContract.sol";

contract CallerContract {
    constructor() {}

    function deployContract() public {
        new CalleeContract(4);
    }

    function create2Contract(bytes32 salt) public {
        new CalleeContract{salt: salt}(6);
    }

}

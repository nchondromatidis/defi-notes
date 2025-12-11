// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library ImportedLib {
    struct InnerStruct {
        address a;
        uint256 b;
    }
    struct OuterStruct {
        InnerStruct st2;
        uint256[] c;
        bytes[3] d;
    }

    struct ReturnStruct {
        uint256 e;
        Status status;
    }

    enum Status {
        Pending,
        Approved,
        Rejected
    }

    type Price is uint256;
}


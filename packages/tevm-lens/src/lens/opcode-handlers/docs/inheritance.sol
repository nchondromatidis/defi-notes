// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


// Recommended order
// - Put utility / abstract / generic contracts first (libraries, access control, base storage, interfaces).
// - Put more concrete / specialized behavior later, with the most specific parent closest to the child.
//
// For multiple inheritance:
// contract Child is Base1, Base2, MoreSpecificBase {}
// where Base1 is more generic than Base2, and MoreSpecificBase is the most specialized.

// ============================================
// 1. FUNCTION IMPLEMENTATION SELECTION
// ============================================
contract Base1 {
    function foo() public pure virtual returns (string memory) {
        return "Base1";
    }
}

contract Base2 {
    function foo() public pure virtual returns (string memory) {
        return "Base2";
    }
}

// Right-to-left C3: Base2 is "more derived"
contract Child1 is Base1, Base2 {
    function foo() public pure override(Base1, Base2) returns (string memory) {
        return "Child1";
    }
}

// Swapping order: Base1 is now "more derived"
contract Child2 is Base2, Base1 {
    function foo() public pure override(Base1, Base2) returns (string memory) {
        return "Child2";
    }
}

// ============================================
// 2. SUPER CALL RESOLUTION
// ============================================
contract A {
    function work() public virtual returns (string memory) {
        return "A";
    }
}

contract B is A {
    function work() public virtual override returns (string memory) {
        return string.concat(super.work(), "->B");
    }
}

contract C is A {
    function work() public virtual override returns (string memory) {
        return string.concat(super.work(), "->C");
    }
}

// C3 order: C1 -> B -> C -> A, so super in C1 calls B, B calls C, C calls A
contract C1 is B, C {
    function work() public override(B, C) returns (string memory) {
        return string.concat(super.work(), "->C1");
    }
}
// Result: "A->C->B->C1"

// C3 order: C2 -> C -> B -> A, so super in C2 calls C, C calls B, B calls A
contract C2 is C, B {
    function work() public override(B, C) returns (string memory) {
        return string.concat(super.work(), "->C2");
    }
}
// Result: "A->B->C->C2"

// ============================================
// 3. CONSTRUCTOR EXECUTION ORDER
// ============================================
contract X {
    uint public x;

    constructor() {
        x = 1;
    }
}

contract Y {
    uint public y;

    constructor() {
        y = 2;
    }
}

contract Z {
    uint public z;

    constructor() {
        z = 3;
    }
}

// C3 linearization: D -> Y -> Z -> X
// Constructors run: X(), Z(), Y(), D() regardless of argument order below
contract D is Y, Z, X {
    uint public d;
    constructor() Y() Z() X() {
        d = 4;
    } // Args order doesn't matter; C3 order does
}

// ============================================
// 4. STATE VARIABLE LAYOUT / COLLISIONS
// ============================================
contract P {
    uint public value = 100;
}

contract Q {
    uint public value = 200;
}

// Compiler error: "Identifier already declared" because both P and Q define 'value'
// contract Collision is P, Q { } // Uncommenting this causes compilation failure

// ============================================
// 5. MODIFIER AND EVENT RESOLUTION
// ============================================
contract M1 {
    modifier check() {
        _;
    }

    event Action(uint x);
}

contract M2 {
    modifier check() virtual {
        _;
    }

    event Action(uint x);
}

// C3 resolves which 'check' and 'Action' are referenced
contract UsesMods is M1, M2 {
    modifier check() override {
        _;
    } // Must override M2's virtual modifier
    // Event 'Action' from both M1 and M2 are the same signature, merged
}

// ============================================
// 6. INVALID INHERITANCE GRAPH
// ============================================
contract G {}

contract H is G {}

// VALID: H is more derived than G, so list G first
contract ValidChild is G, H {}

// INVALID: Linearization impossible because H requires G to come before it,
// but we listed H before G (contradicts partial order)
// contract InvalidChild is H, G { } // Uncommenting causes: "Linearization of inheritance graph impossible"

// ============================================
// 7. OVERRIDE SPECIFIER VALIDATION
// ============================================
contract I {
    function test() public virtual returns (uint) {
        return 1;
    }
}

contract J {
    function test() public virtual returns (uint) {
        return 2;
    }
}

contract OverrideExample is I, J {
    // Must list ALL bases in the linearization that define test()
    function test() public override(I, J) returns (uint) {
        return 3;
    }

    // Missing one from override() would cause:
    // "Derived contract must override function 'test'. Two or more base classes define function with same name and parameter types."
}

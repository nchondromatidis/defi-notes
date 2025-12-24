## Hierarchy (bottom to top):

```
                    F       E       D
                    ^      ^      ^
                     \    /      /
                       C       B
                        ^     ^
                         \   /
                           A
```

Read as:
A is C, B
C is F, E
B is E, D

Interested in:
- constructor execution order
- super-based function resolution chains

Each constructor and each super-call chain emits events so you can assert behavior
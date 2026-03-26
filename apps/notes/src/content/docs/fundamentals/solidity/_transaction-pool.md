---
title: Transaction Pool
sidebar:
  order: 1001
---

This is because of the nature of ethereum transaction processing:
- when a trader submits a transaction, it gets to the node's transaction pool
- the node then propagates the submitted tx to other nodes
- once a node is promoted to miner, it chooses which tx to add to the block and at which order
    - the time that the tx is submitted does not guarantee the tx block order picked by the miner

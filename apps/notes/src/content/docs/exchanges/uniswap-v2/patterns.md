---
title: Patterns
description: Uniswap V2 workflows
sidebar:
  order: 10000
---

Code design:
- core and periphery contracts
- stateless contracts, therefore easily replaceable - `UniswapV2Router02`
- contracts for user facing flows and provide helpers - `UniswapV2Router02`
- deterministic addresses using with CREATE2 - `UniswapV2Factory`


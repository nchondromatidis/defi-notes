---
title: Deployment
sidebar:
  order: 1300
---

## Architecture

Uniswap V2 is composed of Core and Periphery layers.

The Core consists of a singleton Factory and multiple Pair contracts, designed with a "brutalist" minimalism to ensure functional elegance and minimize the attack surface.

This architectural separation means the Core handles safety and the preservation of invariants, while the Periphery handles domain-specific logic like routing and WETH wrapping.

## Deployment

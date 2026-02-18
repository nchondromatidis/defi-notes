---
title: Overview
description: DeFi protocol analysis.
sidebar:
  order: 1000
---

Uniswap v2 exists as a **decentralized alternative to traditional order book exchanges**, which require a "coincidence
of wants" and centralized intermediaries to match buyers and sellers.

Traditional on-chain order books face significant economic inefficiencies due to the high gas costs associated with
creating, canceling, or fulfilling individual orders on a blockchain.

The protocol addresses these inefficiencies by using **Liquidity Pools**, allowing users to trade against a smart
contract rather than a specific counterparty.

## Evolution from Uniswap V1

Furthermore, v2 improves upon v1 by removing the "ETH bridge" requirement, allowing for **arbitrary ERC-20/ERC-20
pairs**.

This reduces costs for liquidity providers (LPs) who previously suffered mandatory exposure to ETH and allows for
**highly correlated pairs** (like stablecoin pairs) to trade with minimal price impact and lower risk of impermanent
loss.

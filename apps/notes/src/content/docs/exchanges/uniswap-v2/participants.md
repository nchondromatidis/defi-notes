---
title: Participants
sidebar:
  order: 1100
---

## Liquidity Providers (LPs)

These participants supply **equal values** (not equal amounts) of two ERC-20 tokens to a pool to facilitate trades.
Their incentive is to earn trading fees, though they risk impermanent loss if the relative price of the tokens deviates
significantly from their entry point.

## Traders

These users interact with the protocol to swap one token for another instantly. They benefit from the lack of a
middleman but pay a 0.3% fee and incur price impact based on the size of their trade relative to the pool's depth.

## Arbitrageurs

These participants monitor price discrepancies between Uniswap and external market rates. Their economic role is to
re-align the pool price with the global market price by trading for a profit, which also ensures the accuracy of the
protocol's price feeds.

## Protocol Developers/Integrators

External smart contracts use Uniswap as a foundational DeFi primitive for price discovery (oracles) or to provide
liquidity for their own applications.

## Fee Beneficiary (Governance)

If activated by a specific private key (feeToSetter), the protocol can redirect **1/6th of the 0.3% trading fee**
(effectively 0.05% of the trade amount) to a designated address.

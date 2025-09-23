# Adding a New Chain to Smart Order Router

This guide documents all the files that need to be modified when adding a new chain to the Uniswap Smart Order Router, based on the Eden Testnet implementation.

## Overview

Adding a new chain requires changes in two main repositories:
1. **Smart Order Router** (main repo)
2. **SDKs** (submodule)

## Smart Order Router Changes

### Core Chain Configuration

#### 1. `src/util/chains.ts`
- Add chain ID to `SUPPORTED_CHAINS` array
- Add chain ID mapping in `ID_TO_CHAIN_ID` function
- Add chain name to `ChainName` enum
- Add native currency name to `NativeCurrencyName` enum
- Add native currency names to `NATIVE_NAMES_BY_ID` object
- Add native currency mapping to `NATIVE_CURRENCY` object
- Add chain name mapping in `ID_TO_NETWORK_NAME` function
- Add RPC provider mapping in `ID_TO_PROVIDER` function
- Add wrapped native currency token to `WRAPPED_NATIVE_CURRENCY` object

#### 2. `src/util/addresses.ts`
- Add V3 core factory address to `V3_CORE_FACTORY_ADDRESSES`
- Add quoter V2 address to `QUOTER_V2_ADDRESSES`
- Add new quoter V2 address to `NEW_QUOTER_V2_ADDRESSES`
- Add protocol V4 quoter address to `PROTOCOL_V4_QUOTER_ADDRESSES`
- Add multicall address to `UNISWAP_MULTICALL_ADDRESSES`
- Add WETH9 token to `WETH9` object

#### 3. `src/util/defaultBlocksToLive.ts`
- Add default blocks to live configuration for the new chain

### Token and Pool Configuration

#### 4. `src/providers/token-provider.ts`
- Add USDC token definition (e.g., `USDC_EDEN_TESTNET`)
- Add any additional token definitions needed

#### 5. `src/util/pool.ts`
- Add V4 ETH/WETH fake pool configuration to `V4_ETH_WETH_FAKE_POOL`

#### 6. `src/routers/legacy-router/bases.ts`
- Add base tokens for trading against in `BASES_TO_CHECK_TRADES_AGAINST`
- Import any new token definitions

### Provider Updates

#### 7. `src/providers/caching-subgraph-provider.ts`
- Add subgraph URL configuration for the new chain

#### 8. `src/providers/caching-token-provider.ts`
- Add token list configuration for the new chain

#### 9. `src/providers/simulation-provider.ts`
- Add simulation configuration for the new chain

#### 10. `src/providers/v2/static-subgraph-provider.ts`
- Add V2 subgraph configuration

#### 11. `src/providers/v3/pool-provider.ts`
- Add V3 pool provider configuration

#### 12. `src/providers/v3/static-subgraph-provider.ts`
- Add V3 static subgraph configuration

#### 13. `src/providers/v3/subgraph-provider.ts`
- Add V3 subgraph provider configuration

### Router Updates

#### 14. `src/routers/alpha-router/alpha-router.ts`
- Add any router-specific configuration

#### 15. `src/routers/alpha-router/gas-models/gas-costs.ts`
- Add gas cost configuration for the new chain

#### 16. `src/routers/alpha-router/gas-models/gas-model.ts`
- Add gas model configuration

#### 17. `src/routers/alpha-router/gas-models/v2/v2-heuristic-gas-model.ts`
- Add V2 gas model configuration

#### 18. `src/routers/alpha-router/quoters/mixed-quoter.ts`
- Add mixed quoter configuration

### Utility Updates

#### 19. `src/util/methodParameters.ts`
- Add any method parameter configurations

#### 20. `src/util/routes.ts`
- Add route configuration (if needed)

### CLI Updates

#### 21. `cli/commands/quote.ts`
- Add CLI support for the new chain

## SDKs Changes

### Core SDK Configuration

#### 1. `sdks/sdk-core/src/chains.ts`
- Add chain ID to `ChainId` enum
- Add chain ID to `SUPPORTED_CHAINS` array
- Add native currency name to `NativeCurrencyName` enum

#### 2. `sdks/sdk-core/src/addresses.ts`
- Define chain addresses object (e.g., `EDEN_TESTNET_ADDRESSES`)
- Add addresses to `CHAIN_TO_ADDRESSES_MAP`

#### 3. `sdks/sdk-core/src/entities/weth9.ts`
- Add WETH9 token definition for the new chain

### Contract Updates

#### 4. `sdks/uniswapx-sdk/src/contracts/`
- Add any new contract definitions if needed
- Update contract factories and exports

#### 5. `sdks/universal-router-sdk/package.json`
- Update package dependencies if needed

#### 6. `sdks/v3-sdk/package.json`
- Update package dependencies if needed

## Environment Variables

Add the following environment variable for the new chain:
```bash
JSON_RPC_PROVIDER_EDEN_TESTNET=<rpc_url>
```

## Package Configuration

#### 7. `package.json` (root)
- Update dependencies if needed

#### 8. `package-lock.json`
- Update lock file

#### 9. `tsconfig.json`
- Update TypeScript configuration if needed

## Example: Eden Testnet Implementation

### Chain Details
- **Chain ID**: 3735928814 (0xDEADBEEF)
- **Chain Name**: eden-testnet
- **Native Currency**: ETH
- **WETH Address**: 0xBBddbb5122e82feD504470E26cA6bb508c1D322f
- **USDC Address**: 0x314DBE138c155d27Cd70c2435A411102Df7CA774

### Key Addresses
- **V3 Core Factory**: 0x0666f679A54eE1ae97E32e980223d9Ba1CED6D65
- **Multicall**: 0x3596f6351415dead29A19197761F5fd3A1d4877D
- **Quoter**: 0xfBA416A341527C4bc3D87F0635169e6D9102f13A
- **V3 Migrator**: 0x95f0d3B9AA9Db3B1ef6117cd547396616A0947A9
- **Nonfungible Position Manager**: 0xc9b916a4f3cF28307b048308E2bF4246C21a9D40
- **Tick Lens**: 0xE3238D44Ee45bD42bb3A2AeeD804aec7b6c92e28
- **Swap Router 02**: 0xCFDff26658fD838363dc9b0435443F175a83F6ce

## Testing

After implementing all changes:
1. Run tests to ensure no regressions
2. Test quote functionality for the new chain
3. Verify all providers work correctly
4. Test CLI commands with the new chain

## Notes

- Some chains may not support all features (V2, V4, etc.)
- Gas models may need adjustment based on chain characteristics
- Subgraph providers may not be available for all chains initially
- Always verify contract addresses are correct and deployed

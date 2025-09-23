# Uniswap Smart Order Router API

A REST API server that provides quote functionality for Uniswap swaps, based on the CLI implementation.

## Endpoints

### Health Check
```
GET /health
```
Returns server status and timestamp.

### Quote
```
POST /quote
GET /quote
```

Get a quote for a token swap.

#### Request Body (POST) or Query Parameters (GET)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `tokenIn` | string | Yes | - | Input token address or native token name (ETH, MATIC, etc.) |
| `tokenOut` | string | Yes | - | Output token address or native token name |
| `amount` | string | Yes | - | Amount to swap (in token units) |
| `exactIn` | boolean | No | true | Whether this is an exact input swap |
| `exactOut` | boolean | No | false | Whether this is an exact output swap |
| `recipient` | string | No | - | Recipient address for the swap |
| `chainId` | number | No | 1 | Chain ID (1 = Mainnet, 137 = Polygon, etc.) |
| `protocols` | string | No | - | Comma-separated protocols (V2,V3,V4) |
| `forceCrossProtocol` | boolean | No | false | Force cross-protocol routes |
| `forceMixedRoutes` | boolean | No | false | Force mixed route combinations |
| `simulate` | boolean | No | false | Simulate the swap |
| `debugRouting` | boolean | No | true | Enable debug routing |
| `enableFeeOnTransferFeeFetching` | boolean | No | false | Enable fee-on-transfer detection |
| `requestBlockNumber` | number | No | - | Specific block number for quote |
| `gasToken` | string | No | - | Gas token address |
| `slippageTolerance` | number | No | 0.5 | Slippage tolerance as percentage (e.g., 0.5 for 0.5%) |
| `topN` | number | No | 3 | Top N pools by TVL |
| `topNTokenInOut` | number | No | 2 | Top N pools for token in/out |
| `topNSecondHop` | number | No | 2 | Top N second hop pools |
| `topNSecondHopForTokenAddressRaw` | string | No | - | Token-specific second hop config (format: "tokenAddress|topN,...") |
| `topNWithEachBaseToken` | number | No | 2 | Top N pools with each base token |
| `topNWithBaseToken` | number | No | 6 | Top N pools with base tokens |
| `topNDirectSwaps` | number | No | 2 | Top N direct swap pools |
| `maxSwapsPerPath` | number | No | 3 | Maximum swaps per path |
| `minSplits` | number | No | 1 | Minimum number of splits |
| `maxSplits` | number | No | 3 | Maximum number of splits |
| `distributionPercent` | number | No | 5 | Distribution percentage |

#### Response

```json
{
  "success": true,
  "data": {
    "blockNumber": "12345678",
    "estimatedGasUsed": "150000",
    "estimatedGasUsedQuoteToken": "0.001234",
    "estimatedGasUsedUSD": "2.50",
    "estimatedGasUsedGasToken": "0.000123",
    "gasPriceWei": "20000000000",
    "methodParameters": {
      "calldata": "0x...",
      "value": "0"
    },
    "quote": "100.50",
    "quoteGasAdjusted": "100.25",
    "route": "WETH -> USDC",
    "simulationStatus": {...}
  }
}
```

## Running the Server

```bash
# Development
npm run dev:api

# Production
npm run start:api
```

## Environment Variables

- `RPC_URL`: RPC endpoint URL (default: Alchemy demo endpoint)
- `PORT`: Server port (default: 3000)
- `TENDERLY_USER`: Tenderly username (optional)
- `TENDERLY_PROJECT`: Tenderly project name (optional)
- `TENDERLY_ACCESS_KEY`: Tenderly access key (optional)
- `TENDERLY_NODE_API_KEY`: Tenderly node API key (optional)

## Example Usage

```bash
# Get a quote for 1 ETH to USDC with 1% slippage tolerance
curl -X POST http://localhost:3000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "ETH",
    "tokenOut": "0xA0b86a33E6441b8c4C8C0C4F8c4C8C0C4F8c4C8C0",
    "amount": "1",
    "exactIn": true,
    "slippageTolerance": 1.0
  }'

# Get a quote using query parameters
curl "http://localhost:3000/quote?tokenIn=ETH&tokenOut=USDC&amount=1&exactIn=true&slippageTolerance=0.5"
```

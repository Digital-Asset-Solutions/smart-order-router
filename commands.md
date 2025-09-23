WETH USDC

./bin/cli quote --tokenIn 0x314DBE138c155d27Cd70c2435A411102Df7CA774 --tokenOut 0x0d3597CD03a42e523CF6ebB56b216b9c2b6EF6a2 --amount 1 --exactIn --minSplits 1 --protocols v3 --router alpha --chainId 3735928814

WETH ZANGO
./bin/cli quote --tokenIn 0x0d3597CD03a42e523CF6ebB56b216b9c2b6EF6a2 --tokenOut 0xdb408CBbb11938f0bADb3eFA998631F85C114D4B --amount 1 --exactIn --minSplits 1 --protocols v3 --router legacy --chainId 3735928814 --debug --simulate

BTC ZANGO
./bin/cli quote --tokenIn 0xaBd9cf1Bc5bCb7C1927BF4dECF44789644877e09 --tokenOut 0xdb408CBbb11938f0bADb3eFA998631F85C114D4B --amount 0.01 --exactIn --minSplits 1 --protocols v3 --router alpha --chainId 3735928814 --debug --recipient 0x7554ee28c15e61D9B3CEbcC9F5CAcE7742830B05

curl -X POST http://localhost:3000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0xaBd9cf1Bc5bCb7C1927BF4dECF44789644877e09",
    "tokenOut": "0xdb408CBbb11938f0bADb3eFA998631F85C114D4B",
    "amount": "0.01",
    "exactIn": true,
    "minSplits": 1,
    "protocols": "v3",
    "chainId": 3735928814,
    "recipient": "0x7554ee28c15e61D9B3CEbcC9F5CAcE7742830B05"
  }'


cd /Users/anthoy/DAS/uniswap-fork/smart-order-router/sdks && yarn install --inline-builds && yarn sdk @uniswap/sdk-core build && yarn sdk @uniswap/v2-sdk build && yarn sdk @uniswap/v3-sdk build && yarn sdk @uniswap/v4-sdk build && yarn sdk @uniswap/router-sdk build && yarn sdk @uniswap/permit2-sdk build && yarn sdk @uniswap/universal-router-sdk build
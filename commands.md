DUSD DAI

./bin/cli quote --tokenIn 0x2294657125076661A89563FD95524a68283fa579 --tokenOut 0x19d329233a007aD9190E9f5Ef3675D24AfEdB2E9 --amount 1 --exactIn --minSplits 1 --protocols v3 --router alpha --chainId 3735928814

WETH ZANGO
./bin/cli quote --tokenIn 0x0d3597CD03a42e523CF6ebB56b216b9c2b6EF6a2 --tokenOut 0xdb408CBbb11938f0bADb3eFA998631F85C114D4B --amount 1 --exactIn --minSplits 1 --protocols v3 --router legacy --chainId 3735928814 --debug --simulate

CUSTOMS
./bin/cli quote --tokenIn 0xa9349a683ff45daeadc73dc9b5852b88fd569c41 --tokenOut 0xfe5ae2bc9a2322f165383ec85b8b1fdc0fb2e07e --amount 1 --exactIn --minSplits 1 --protocols v3 --router alpha --chainId 3735928814 --debug --recipient 0x7554ee28c15e61D9B3CEbcC9F5CAcE7742830B05

curl -X POST http://localhost:3000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x2294657125076661A89563FD95524a68283fa579",
    "tokenOut": "0x19d329233a007aD9190E9f5Ef3675D24AfEdB2E9",
    "amount": "1",
    "exactIn": true,
    "minSplits": 1,
    "protocols": "v3",
    "chainId": 3735928814,
    "recipient": "0x7554ee28c15e61D9B3CEbcC9F5CAcE7742830B05",
    "simulate": true
  }'


cd /Users/anthoy/DAS/uniswap-fork/smart-order-router/sdks && yarn install --inline-builds && yarn sdk @uniswap/sdk-core build && yarn sdk @uniswap/v2-sdk build && yarn sdk @uniswap/v3-sdk build && yarn sdk @uniswap/v4-sdk build && yarn sdk @uniswap/router-sdk build && yarn sdk @uniswap/permit2-sdk build && yarn sdk @uniswap/universal-router-sdk build
import { Logger } from '@ethersproject/logger';
import { JsonRpcProvider } from '@ethersproject/providers';
import DEFAULT_TOKEN_LIST from '@uniswap/default-token-list';
// import { Protocol } from '@uniswap/router-sdk';
import { Currency, Percent, TradeType } from '@uniswap/sdk-core';
import { ChainId, Token } from '@uniswap/sdk-core';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import _, { toInteger } from 'lodash';
import NodeCache from 'node-cache';

import {
  AlphaRouter,
  CachingGasStationProvider,
  CachingTokenListProvider,
  CachingTokenProviderWithFallback,
  CachingV3PoolProvider,
  CachingV4PoolProvider,
  GasPrice,
  MapWithLowerCaseKey,
  nativeOnChain,
  NodeJSCache,
  OnChainGasPriceProvider,
  parseAmount,
  SwapRoute,
  SwapType,
  TokenProvider,
  UniswapMulticallProvider,
  V2PoolProvider,
  V3PoolProvider,
  V3SubgraphProvider,
  V4PoolProvider,
} from '../index';
import { EIP1559GasPriceProvider } from '../providers/eip-1559-gas-price-provider';
import { EthEstimateGasSimulator } from '../providers/eth-estimate-gas-provider';
import { LegacyGasPriceProvider } from '../providers/legacy-gas-price-provider';
import { PortionProvider } from '../providers/portion-provider';
import { FallbackTenderlySimulator } from '../providers/tenderly-simulation-provider';
import { TenderlySimulator } from '../providers/tenderly-simulation-provider';
import { OnChainTokenFeeFetcher } from '../providers/token-fee-fetcher';
import { TokenPropertiesProvider } from '../providers/token-properties-provider';
import { ID_TO_CHAIN_ID, ID_TO_PROVIDER, NATIVE_NAMES_BY_ID } from '../util';


dotenv.config();

Logger.globalLogger();
Logger.setLogLevel(Logger.levels.DEBUG);

interface QuoteRequest {
  tokenIn: string;
  tokenOut: string;
  amount: string;
  exactIn?: boolean;
  exactOut?: boolean;
  recipient?: string;
  chainId?: number;
  protocols?: string;
  forceCrossProtocol?: boolean;
  forceMixedRoutes?: boolean;
  simulate?: boolean;
  debugRouting?: boolean;
  enableFeeOnTransferFeeFetching?: boolean;
  requestBlockNumber?: number;
  gasToken?: string;
  slippageTolerance?: number; // Slippage tolerance as a percentage (e.g., 0.5 for 0.5%)
  // Pool selection parameters
  topN?: number;
  topNTokenInOut?: number;
  topNSecondHop?: number;
  topNSecondHopForTokenAddressRaw?: string;
  topNWithEachBaseToken?: number;
  topNWithBaseToken?: number;
  topNDirectSwaps?: number;
  maxSwapsPerPath?: number;
  minSplits?: number;
  maxSplits?: number;
  distributionPercent?: number;
}

interface QuoteResponse {
  success: boolean;
  data?: {
    blockNumber: string;
    estimatedGasUsed: string;
    estimatedGasUsedQuoteToken: string;
    estimatedGasUsedUSD: string;
    estimatedGasUsedGasToken?: string;
    gasPriceWei: string;
    methodParameters?: {
      calldata: string;
      value: string;
    };
    quote: string;
    quoteGasAdjusted: string;
    route: string;
    simulationStatus?: any;
  };
  error?: string;
}

class QuoteService {
  private router: AlphaRouter | null = null;
  private tokenProvider: CachingTokenProviderWithFallback | null = null;
  private chainId: ChainId;

  constructor(chainId: ChainId = ChainId.MAINNET) {
    this.chainId = chainId;
  }

  async initialize() {
    const startTime = Date.now();
    console.log('🚀 Starting QuoteService initialization...');
    
    console.log('📡 Creating RPC provider...');
    const providerStart = Date.now();
    const provider = new JsonRpcProvider(
      ID_TO_PROVIDER(this.chainId),
      this.chainId
    );
    console.log(`✅ RPC provider created in ${Date.now() - providerStart}ms`);

    // Do not cache a block number at startup; let the router fetch the latest per-request.

    console.log('💾 Creating token cache...');
    const tokenCache = new NodeJSCache<Token>(
      new NodeCache({ stdTTL: 3600, useClones: false })
    );

    console.log('📋 Loading token list provider...');
    const tokenListStart = Date.now();
    const tokenListProvider = await CachingTokenListProvider.fromTokenList(
      this.chainId,
      DEFAULT_TOKEN_LIST,
      tokenCache
    );
    console.log(`✅ Token list provider loaded in ${Date.now() - tokenListStart}ms`);

    console.log('🔗 Creating multicall provider...');
    const multicall2Provider = new UniswapMulticallProvider(this.chainId, provider);

    console.log('🪙 Setting up token providers...');
    const tokenProviderOnChain = new TokenProvider(this.chainId, multicall2Provider);
    this.tokenProvider = new CachingTokenProviderWithFallback(
      this.chainId,
      tokenCache,
      tokenListProvider,
      tokenProviderOnChain
    );
    console.log('✅ Token providers configured');

    console.log('⛽ Setting up gas price cache...');
    const gasPriceCache = new NodeJSCache<GasPrice>(
      new NodeCache({ stdTTL: 15, useClones: true })
    );

    console.log('🏊 Setting up V4 pool provider...');
    const v4PoolProvider = new CachingV4PoolProvider(
      this.chainId,
      new V4PoolProvider(this.chainId, multicall2Provider),
      new NodeJSCache(new NodeCache({ stdTTL: 360, useClones: false }))
    );

    console.log('🏊 Setting up V3 pool provider...');
    const v3PoolProvider = new CachingV3PoolProvider(
      this.chainId,
      new V3PoolProvider(this.chainId, multicall2Provider),
      new NodeJSCache(new NodeCache({ stdTTL: 360, useClones: false }))
    );
    const v3SubgraphProvider = new V3SubgraphProvider(this.chainId);

    console.log('💰 Setting up token fee fetcher...');
    const tokenFeeFetcher = new OnChainTokenFeeFetcher(this.chainId, provider);
    const tokenPropertiesProvider = new TokenPropertiesProvider(
      this.chainId,
      new NodeJSCache(new NodeCache({ stdTTL: 360, useClones: false })),
      tokenFeeFetcher
    );

    console.log('🏊 Setting up V2 pool provider...');
    const v2PoolProvider = new V2PoolProvider(this.chainId, multicall2Provider, tokenPropertiesProvider);
    console.log('📊 Setting up portion provider...');
    const portionProvider = new PortionProvider();

    console.log('🔮 Setting up Tenderly simulator...');
    const tenderlySimulator = new TenderlySimulator(
      this.chainId,
      'https://api.tenderly.co',
      process.env.TENDERLY_USER || '',
      process.env.TENDERLY_PROJECT || '',
      process.env.TENDERLY_ACCESS_KEY || '',
      process.env.TENDERLY_NODE_API_KEY || '',
      v2PoolProvider,
      v3PoolProvider,
      v4PoolProvider,
      provider,
      portionProvider,
      { [ChainId.ARBITRUM_ONE]: 1 },
      5000,
      100,
      [ChainId.MAINNET]
    );

    console.log('⛽ Setting up ETH gas estimator...');
    const ethEstimateGasSimulator = new EthEstimateGasSimulator(
      this.chainId,
      provider,
      v2PoolProvider,
      v3PoolProvider,
      v4PoolProvider,
      portionProvider
    );

    console.log('🔄 Setting up fallback simulator...');
    const simulator = new FallbackTenderlySimulator(
      this.chainId,
      provider,
      portionProvider,
      tenderlySimulator,
      ethEstimateGasSimulator
    );

    console.log('🚀 Creating Alpha Router...');
    const routerStart = Date.now();
    this.router = new AlphaRouter({
      provider,
      chainId: this.chainId,
      multicall2Provider: multicall2Provider,
      v3SubgraphProvider: v3SubgraphProvider,
      gasPriceProvider: new CachingGasStationProvider(
        this.chainId,
        new OnChainGasPriceProvider(
          this.chainId,
          new EIP1559GasPriceProvider(provider),
          new LegacyGasPriceProvider(provider)
        ),
        gasPriceCache
      ),
      simulator,
    });
    console.log(`✅ Alpha Router created successfully in ${Date.now() - routerStart}ms!`);
    console.log(`🎉 QuoteService initialization completed in ${Date.now() - startTime}ms total!`);
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    try {
      if (!this.router || !this.tokenProvider) {
        throw new Error('Service not initialized');
      }

      const {
        tokenIn: tokenInStr,
        tokenOut: tokenOutStr,
        amount: amountStr,
        exactIn,
        recipient,
        simulate = false,
        slippageTolerance = 0.5, // Default 0.5% slippage
        topNSecondHopForTokenAddressRaw = '',
        requestBlockNumber,
        // protocols: protocolsStr,
        // forceCrossProtocol = false,
        // forceMixedRoutes = false,
        // debugRouting = true,
        // enableFeeOnTransferFeeFetching = false,
        // gasToken,
        // topN = 3,
        // topNTokenInOut = 2,
        // topNSecondHop = 2,
        // topNWithEachBaseToken = 2,
        // topNWithBaseToken = 6,
        // topNDirectSwaps = 2,
        maxSwapsPerPath = 5,
        // minSplits = 1,
        // maxSplits = 100,
        // distributionPercent = 5,
      } = request;

      // Parse protocols
      // let protocols: Protocol[] = [];
      // if (protocolsStr) {
      //   try {
      //     protocols = _.map(protocolsStr.split(','), (protocolStr) =>
      //       TO_PROTOCOL(protocolStr)
      //     );
      //   } catch (err) {
      //     throw new Error(`Protocols invalid. Valid options: ${Object.values(Protocol)}`);
      //   }
      // }

      // Parse topNSecondHopForTokenAddress
      const topNSecondHopForTokenAddress = new MapWithLowerCaseKey<number>();
      topNSecondHopForTokenAddressRaw.split(',').forEach((entry) => {
        if (entry != '') {
          const entryParts = entry.split('|');
          if (entryParts.length != 2) {
            throw new Error('topNSecondHopForTokenAddressRaw must be in format tokenAddress|topN,...');
          }
          const topNForTokenAddress = Number(entryParts[1]!);
          topNSecondHopForTokenAddress.set(entryParts[0]!, topNForTokenAddress);
        }
      });

      // Get tokens
      const tokenIn: Currency = NATIVE_NAMES_BY_ID[this.chainId]!.includes(tokenInStr)
        ? nativeOnChain(this.chainId)
        : (await this.tokenProvider.getTokens([tokenInStr])).getTokenByAddress(tokenInStr)!;

      const tokenOut: Currency = NATIVE_NAMES_BY_ID[this.chainId]!.includes(tokenOutStr)
        ? nativeOnChain(this.chainId)
        : (await this.tokenProvider.getTokens([tokenOutStr])).getTokenByAddress(tokenOutStr)!;

      let swapRoutes: SwapRoute | null;

      if (exactIn) {
        const amountIn = parseAmount(amountStr, tokenIn);
        swapRoutes = await this.router.route(
          amountIn,
          tokenOut,
          TradeType.EXACT_INPUT,
          recipient
            ? {
                type: SwapType.SWAP_ROUTER_02,
                deadline: toInteger((new Date().getTime() + 1000 * 60 * 10) / 1000), // 10 minutes
                recipient,
                slippageTolerance: new Percent(Math.floor(slippageTolerance * 100), 10_000),
                simulate: simulate ? { fromAddress: recipient } : undefined,
              }
            : undefined,
          {
            blockNumber: requestBlockNumber,
            maxSwapsPerPath,
          }
          // {
          //   // Use the caller-provided block number if any; otherwise let the router use latest.
          //   blockNumber: requestBlockNumber,
          //   v3PoolSelection: {
          //     topN,
          //     topNTokenInOut,
          //     topNSecondHop,
          //     topNSecondHopForTokenAddress,
          //     topNWithEachBaseToken,
          //     topNWithBaseToken,
          //     topNDirectSwaps,
          //   },
          //   maxSwapsPerPath,
          //   minSplits,
          //   maxSplits,
          //   distributionPercent,
          //   protocols,
          //   forceCrossProtocol,
          //   forceMixedRoutes,
          //   debugRouting,
          //   enableFeeOnTransferFeeFetching,
          //   gasToken,
          // }
        );
      } else {
        const amountOut = parseAmount(amountStr, tokenOut);
        swapRoutes = await this.router.route(
          amountOut,
          tokenIn,
          TradeType.EXACT_OUTPUT,
          recipient
            ? {
                type: SwapType.SWAP_ROUTER_02,
                deadline: toInteger((new Date().getTime() + 1000 * 60 * 10) / 1000), // 10 minutes
                recipient,
                slippageTolerance: new Percent(Math.floor(slippageTolerance * 100), 10_000),
                simulate: simulate ? { fromAddress: recipient } : undefined,
              }
            : undefined,
          {
            blockNumber: requestBlockNumber,
            maxSwapsPerPath,
          }
          // {
          //   blockNumber: requestBlockNumber,
          //   v3PoolSelection: {
          //     topN,
          //     topNTokenInOut,
          //     topNSecondHop,
          //     topNSecondHopForTokenAddress,
          //     topNWithEachBaseToken,
          //     topNWithBaseToken,
          //     topNDirectSwaps,
          //   },
          //   maxSwapsPerPath,
          //   minSplits,
          //   maxSplits,
          //   distributionPercent,
          //   protocols,
          //   forceCrossProtocol,
          //   forceMixedRoutes,
          //   debugRouting,
          //   enableFeeOnTransferFeeFetching,
          //   gasToken,
          // }
        );
      }

      if (!swapRoutes) {
        throw new Error('Could not find route');
      }

      const {
        blockNumber,
        estimatedGasUsed,
        estimatedGasUsedQuoteToken,
        estimatedGasUsedUSD,
        estimatedGasUsedGasToken,
        gasPriceWei,
        methodParameters,
        quote,
        quoteGasAdjusted,
        route: routeAmounts,
        simulationStatus,
      } = swapRoutes;

      return {
        success: true,
        data: {
          blockNumber: blockNumber.toString(),
          estimatedGasUsed: estimatedGasUsed.toString(),
          estimatedGasUsedQuoteToken: estimatedGasUsedQuoteToken.toFixed(
            Math.min(estimatedGasUsedQuoteToken.currency.decimals, 6)
          ),
          estimatedGasUsedUSD: estimatedGasUsedUSD.toFixed(
            Math.min(estimatedGasUsedUSD.currency.decimals, 6)
          ),
          estimatedGasUsedGasToken: estimatedGasUsedGasToken
            ? estimatedGasUsedGasToken.toFixed(
                Math.min(estimatedGasUsedGasToken.currency.decimals, 6)
              )
            : undefined,
          gasPriceWei: gasPriceWei.toString(),
          methodParameters: methodParameters
            ? {
                calldata: methodParameters.calldata,
                value: methodParameters.value,
              }
            : undefined,
          quote: quote.toExact(),
          quoteGasAdjusted: quoteGasAdjusted.toFixed(
            Math.min(quoteGasAdjusted.currency.decimals, 2)
          ),
          route: routeAmounts.map((route) => route.toString()).join(' -> '),
          simulationStatus,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize quote service
const configuredChainId: ChainId = process.env.CHAIN_ID
  ? ID_TO_CHAIN_ID(Number(process.env.CHAIN_ID))
  : ChainId.SOMNIA;
console.log(
  `Using chainId ${configuredChainId} with RPC ${ID_TO_PROVIDER(configuredChainId)}`
);
const quoteService = new QuoteService(configuredChainId);
let isInitialized = false;

quoteService.initialize()
  .then(() => {
    isInitialized = true;
    console.log('Quote service initialized successfully');
  })
  .catch((error) => {
    console.error('Failed to initialize quote service:', error);
  });

// Routes
app.get('/health', (_: Request, res: Response) => {
  res.json({ 
    status: isInitialized ? 'OK' : 'INITIALIZING', 
    initialized: isInitialized,
    timestamp: new Date().toISOString() 
  });
});

app.post('/quote', async (req: Request, res: Response) => {
  try {
    if (!isInitialized) {
      res.status(503).json({
        success: false,
        error: 'Service is still initializing. Please try again in a moment.',
      });
      return;
    }
  
    const result = await quoteService.getQuote(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

app.get('/quote', async (req: Request, res: Response) => {
  try {
    if (!isInitialized) {
      res.status(503).json({
        success: false,
        error: 'Service is still initializing. Please try again in a moment.',
      });
      return;

    }
  
    const result = await quoteService.getQuote(req.query as any);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Error handling middleware
app.use((err: Error, _: Request, res: Response, __: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 404 handler
app.use((_: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

app.listen(port, () => {
  console.log(`Uniswap Smart Order Router API server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Quote endpoint: http://localhost:${port}/quote`);
});

export default app;

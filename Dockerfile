FROM node:20-bullseye

# Build tools for node-gyp dependencies (keccak, secp256k1, etc.)
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  git \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy repository (includes local sdks workspace)
COPY . .

# Use the Yarn version pinned in package.json via Corepack
RUN corepack enable

# Install all workspaces with node-modules linker and build-time scripts
RUN yarn install --inline-builds

# Build local sdks, delete node_modules after to avoid conflicts
RUN cd ./sdks && yarn install --inline-builds && yarn sdk @uniswap/sdk-core build && yarn sdk @uniswap/v2-sdk build && yarn sdk @uniswap/v3-sdk build && yarn sdk @uniswap/v4-sdk build && yarn sdk @uniswap/router-sdk build && yarn sdk @uniswap/permit2-sdk build && yarn sdk @uniswap/universal-router-sdk build && rm -rf node_modules

# Build root (typechain + tsc)
RUN yarn build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "build/main/api/server.js"]



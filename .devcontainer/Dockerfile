FROM node:20-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create workspace
WORKDIR /workspace

# Create output/cache dirs with correct permissions
RUN mkdir -p output cache forms templates && \
    chown -R node:node /workspace

USER node

# Copy package files and install dependencies
COPY --chown=node:node package.json package-lock.json* ./
RUN npm install

COPY --chown=node:node . .

CMD ["npm", "run", "dev"]

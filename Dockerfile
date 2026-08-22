FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless python3 make g++ pkg-config \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p minecraft/forge minecraft/mods minecraft/config minecraft/logs
ENV JAVA_PATH=java MINECRAFT_HOME=minecraft FORGE_HOME=minecraft/forge MOD_DIRECTORY=minecraft/mods
EXPOSE 3000
CMD ["npm", "start"]

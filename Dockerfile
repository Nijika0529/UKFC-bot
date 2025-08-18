# --- Stage 1: Build Stage ---
FROM node:18-slim AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx tsc


# --- Stage 2: Production Stage ---
FROM node:18-slim
WORKDIR /usr/src/app

# [安全] 创建低权限用户
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# --- [核心修改] ---
# 新增了 ca-certificates 包来提供受信任的根证书，解决 SSL 证书验证问题
RUN apt-get update && apt-get install -y iputils-ping libicu72 openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# 从构建阶段复制所有必要的文件
COPY --from=builder /usr/src/app/package*.json ./
RUN npm ci --only=production
COPY --from=builder /usr/src/app/dist ./dist
COPY Lagrange.OneBot ./
RUN chmod +x ./Lagrange.OneBot

# [数据持久化] 创建日志目录挂载点
RUN mkdir logs && chown -R appuser:appgroup logs

# [安全] 更改工作目录所有权
RUN chown -R appuser:appgroup .

# 为 .NET 单文件应用设置一个可写的临时解压目录
ENV DOTNET_BUNDLE_EXTRACT_BASE_DIR=/tmp/dotnet_bundle

# [安全] 切换到低权限用户
USER appuser

# 默认命令，保持容器持续运行
CMD [ "tail", "-f", "/dev/null" ]
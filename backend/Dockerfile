FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential cmake git libssl-dev \
    libjsoncpp-dev uuid-dev zlib1g-dev \
    libmysqlclient-dev libhiredis-dev \
    libbrotli-dev libpq-dev \
    curl pkg-config libhpdf-dev \
    && rm -rf /var/lib/apt/lists/*

# Build Drogon from source
RUN git clone --depth 1 --branch v1.9.6 https://github.com/drogonframework/drogon.git /tmp/drogon \
    && cd /tmp/drogon && git submodule update --init \
    && mkdir build && cd build \
    && cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_MYSQL=ON -DBUILD_REDIS=ON \
    && make -j$(nproc) && make install \
    && rm -rf /tmp/drogon

WORKDIR /app
COPY . .

RUN mkdir build && cd build \
    && cmake .. -DCMAKE_BUILD_TYPE=Release \
    && make -j$(nproc)

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    libssl3 libjsoncpp25 libmysqlclient21 \
    libhiredis0.14 libbrotli1 libhpdf2.3 \
    texlive-latex-base texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/build/resume_backend .
COPY config.json .

RUN mkdir -p /app/storage

EXPOSE 8080
CMD ["./resume_backend"]

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app


RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    git \
    ca-certificates \
    ruby \
    ruby-dev \
  && rm -rf /var/lib/apt/lists/*


RUN gem install nova_git_stats -v 2.4.2 --no-document

RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && curl -L -o /usr/local/bin/scc \
     https://github.com/boyter/scc/releases/latest/download/scc_Linux_x86_64 \
  && chmod +x /usr/local/bin/scc \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

RUN mkdir -p /app/staticfiles

EXPOSE 8000

# syntax=docker/dockerfile:1
ARG RUBY_VERSION=3.4.12
FROM ruby:${RUBY_VERSION}-slim AS base
WORKDIR /rails
ENV RAILS_ENV=production \
    BUNDLE_DEPLOYMENT=1 \
    BUNDLE_PATH=/usr/local/bundle

FROM base AS build
RUN apt-get update -qq && apt-get install --no-install-recommends -y build-essential libssl-dev libyaml-dev pkg-config && rm -rf /var/lib/apt/lists/*
COPY Gemfile Gemfile.lock ./
RUN bundle install && rm -rf /usr/local/bundle/ruby/*/cache

FROM base
RUN apt-get update -qq && apt-get install --no-install-recommends -y curl sqlite3 tzdata && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1000 rails \
    && useradd --uid 1000 --gid 1000 --create-home rails \
    && mkdir -p /data /rails/log /rails/storage /rails/tmp \
    && chown -R rails:rails /data /rails
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --chown=rails:rails . .
USER rails
EXPOSE 3000
ENTRYPOINT ["/rails/bin/docker-entrypoint"]
CMD ["./bin/rails", "server", "-b", "0.0.0.0"]

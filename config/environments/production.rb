Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false
  config.public_file_server.enabled = true
  config.secret_key_base = ENV.fetch("SECRET_KEY_BASE")

  config.hosts = ENV.fetch("APP_HOSTS", "localhost,127.0.0.1").split(",").map(&:strip)
  config.host_authorization = { exclude: ->(request) { request.path == "/up" } }
  config.assume_ssl = ENV["FORCE_SSL"] == "true"
  config.force_ssl = config.assume_ssl
  config.ssl_options = { redirect: { exclude: ->(request) { request.path == "/up" } } }

  config.logger = ActiveSupport::TaggedLogging.logger($stdout)
  config.log_tags = [:request_id]
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")
  config.silence_healthcheck_path = "/up"
  config.active_record.dump_schema_after_migration = false
end

max_threads = ENV.fetch("RAILS_MAX_THREADS", 5).to_i
threads max_threads, max_threads
port ENV.fetch("PORT", 3000)

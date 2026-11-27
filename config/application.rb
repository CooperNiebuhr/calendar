require_relative "boot"

require "rails"
require "active_record/railtie"
require "action_controller/railtie"
require "action_view/railtie"
require "rails/test_unit/railtie"

Bundler.require(*Rails.groups)

module PersonalCalendar
  class Application < Rails::Application
    config.load_defaults 8.1
    config.time_zone = "America/New_York"
    config.filter_parameters += %i[title notes]
  end
end

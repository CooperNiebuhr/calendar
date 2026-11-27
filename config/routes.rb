Rails.application.routes.draw do
  root "calendars#show"
  get "up" => "rails/health#show", as: :rails_health_check
  resources :entries, controller: "calendar_entries", only: %i[index create update destroy]
end

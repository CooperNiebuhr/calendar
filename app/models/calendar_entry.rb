class CalendarEntry < ActiveRecord::Base
  PUBLIC_FIELDS = %i[id title date time notes].freeze
  DATE_FORMAT = /\A(?!0000)\d{4}-\d{2}-\d{2}\z/
  TIME_FORMAT = /\A(?:[01]\d|2[0-3]):[0-5]\d\z/

  normalizes :title, with: ->(title) { title.strip }
  normalizes :time, with: ->(time) { time.to_s.strip }, apply_to_nil: true
  normalizes :notes, with: ->(notes) { notes.to_s }, apply_to_nil: true
  validates :title, presence: true, length: { maximum: 80 }
  validates :notes, length: { maximum: 240 }
  validates :time, format: { with: TIME_FORMAT, message: "must be in HH:MM format" }, allow_blank: true
  validate :valid_calendar_date

  def self.parse_date(value)
    Date.iso8601(value) if value.is_a?(String) && DATE_FORMAT.match?(value)
  rescue Date::Error
    nil
  end

  private

  def valid_calendar_date
    raw_date = date_before_type_cast
    return if raw_date.is_a?(Date) || self.class.parse_date(raw_date)

    errors.add(:date, "must be a valid calendar date")
  end
end

ENV["RAILS_ENV"] ||= "test"
require_relative "../../config/environment"
require "rails/test_help"

class CalendarEntriesTest < ActionDispatch::IntegrationTest
  test "the calendar page serves its JavaScript" do
    get root_path
    assert_response :ok
    assert_select "script[src='/calendar.js']"
    get "/calendar.js"
    assert_response :ok
  end

  test "entries can be created, moved to a new date, and removed" do
    post entries_path, params: { entry: { title: "  Return library books  ", date: "2026-12-31" } }, as: :json
    assert_response :created
    entry = response.parsed_body
    assert_equal "Return library books", entry.fetch("title")
    assert_equal "2026-12-31", entry.fetch("date")
    assert_equal "", entry.fetch("time")

    patch entry_path(entry.fetch("id")), params: { entry: { date: "2027-01-01", time: "09:30", notes: "Bring both books" } }, as: :json
    assert_response :ok
    assert_equal ["2027-01-01", "09:30", "Bring both books"], response.parsed_body.values_at("date", "time", "notes")

    delete entry_path(entry.fetch("id")), as: :json
    assert_response :no_content
    refute CalendarEntry.exists?(entry.fetch("id"))
  end

  test "date ranges include both ends across years and order entries by time" do
    CalendarEntry.create!(title: "Later", date: "2027-01-01", time: "17:00")
    CalendarEntry.create!(title: "All day", date: "2027-01-01")
    CalendarEntry.create!(title: "Midnight", date: "2027-01-01", time: "00:00")
    CalendarEntry.create!(title: "Range start", date: "2026-12-27")
    CalendarEntry.create!(title: "Outside", date: "2027-01-03")

    get entries_path, params: { from: "2026-12-27", through: "2027-01-02" }, as: :json
    assert_response :ok
    assert_equal ["Range start", "All day", "Midnight", "Later"], response.parsed_body.pluck("title")
  end

  test "invalid entry fields return useful errors and save nothing" do
    assert_no_difference "CalendarEntry.count" do
      post entries_path, params: { entry: { title: "  ", date: "2027-02-29", time: "24:05", notes: "a" * 241 } }, as: :json
    end
    assert_response :unprocessable_content
    assert_equal ["Date", "Notes", "Time", "Title"], response.parsed_body.fetch("errors").map { |error| error.split.first }.sort
  end

  test "invalid ranges and missing entries return JSON errors" do
    get entries_path, params: { from: "2027-02-29", through: "2027-03-02" }, as: :json
    assert_response :unprocessable_content
    get entries_path, params: { from: "2027-02-01", through: "2027-01-01" }, as: :json
    assert_response :unprocessable_content
    patch entry_path(0), params: { entry: { title: "Missing" } }, as: :json
    assert_response :not_found
  end
end

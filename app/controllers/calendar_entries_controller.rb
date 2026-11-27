class CalendarEntriesController < ApplicationController
  before_action :load_entry, only: %i[update destroy]
  rescue_from ActiveRecord::RecordNotFound do
    render json: { errors: ["This entry no longer exists."] }, status: :not_found
  end

  def index
    first = CalendarEntry.parse_date(params[:from])
    last = CalendarEntry.parse_date(params[:through])
    unless first && last && (0...62).cover?(last - first)
      return render json: { errors: ["Provide a date range of up to 62 days."] }, status: :unprocessable_content
    end

    entries = CalendarEntry.where(date: first..last).order(:date, :time, :title, :id)
    render json: entries.as_json(only: CalendarEntry::PUBLIC_FIELDS)
  end

  def create
    entry = CalendarEntry.new(entry_params)
    save_entry(entry, status: :created)
  end

  def update
    @entry.assign_attributes(entry_params)
    save_entry(@entry)
  end

  def destroy
    @entry.destroy!
    head :no_content
  end

  private

  def load_entry
    @entry = CalendarEntry.find(params[:id])
  end

  def entry_params
    params.expect(entry: %i[title date time notes])
  end

  def save_entry(entry, status: :ok)
    if entry.save
      render json: entry.as_json(only: CalendarEntry::PUBLIC_FIELDS), status: status
    else
      render json: { errors: entry.errors.full_messages }, status: :unprocessable_content
    end
  end
end

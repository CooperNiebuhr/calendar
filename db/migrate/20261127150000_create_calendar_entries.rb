class CreateCalendarEntries < ActiveRecord::Migration[8.1]
  def change
    create_table :calendar_entries do |table|
      table.string :title, null: false
      table.date :date, null: false
      table.string :time, null: false, default: ""
      table.text :notes, null: false, default: ""
      table.timestamps

      table.index [:date, :time]
    end
  end
end

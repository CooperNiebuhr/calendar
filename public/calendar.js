const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const paths = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>'
};

const dateFormat = {
  today: new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/New_York' }),
  monthYear: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  short: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
  withWeekday: new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
  full: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }),
  weekday: new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' })
};
const layout = document.querySelector('#layout');
const periodTitle = document.querySelector('#period-title');
const dialog = document.querySelector('#item-dialog');
const form = document.querySelector('#item-form');
const announcement = document.querySelector('#announcement');
const loadError = document.querySelector('#load-error');
const itemError = document.querySelector('#item-error');
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
let items = [];
let selected = parseDate(todayKey());
let editingId;
let loadController;
let loading = true;
let saving = false;

async function requestEntries(url, { method = 'GET', fields, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
  if (fields) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, {
    method, headers, signal,
    body: fields ? JSON.stringify({ entry: fields }) : undefined
  });
  if (response.status === 204) return;
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
  if (!response.ok) throw new Error(data?.errors?.join(' ') || 'The change couldn’t be saved. Try again.');
  return data;
}

function fetchRange(first, last, signal) {
  const query = new URLSearchParams({ from: iso(first), through: iso(last) });
  return requestEntries(`/entries?${query}`, { signal });
}

async function refreshEntries() {
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  loading = true;
  loadError.hidden = true;
  layout.setAttribute('aria-busy', 'true');
  const days = monthDays(selected);
  const [first, last] = upcomingRange(todayKey());
  try {
    const [month, upcoming] = await Promise.all([
      fetchRange(days[0], days.at(-1), controller.signal),
      fetchRange(first, last, controller.signal)
    ]);
    if (controller.signal.aborted) return;
    const byId = new Map([...month, ...upcoming].map(item => [item.id, item]));
    items = [...byId.values()];
  } catch {
    if (!controller.signal.aborted) loadError.hidden = false;
  } finally {
    if (loadController === controller) {
      loading = false;
      layout.removeAttribute('aria-busy');
      render();
    }
  }
}

function todayKey() {
  const parts = Object.fromEntries(dateFormat.today.formatToParts().map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseDate(value) { return new Date(`${value}T12:00:00Z`); }
function iso(date) { return date.toISOString().slice(0, 10); }

function addDays(date, count) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + count);
  return result;
}

function firstOfMonth(date) { return addDays(date, 1 - date.getUTCDate()); }
function mondayIndex(date) { return (date.getUTCDay() + 6) % 7; }

function monthDays(date) {
  const first = firstOfMonth(date);
  const last = new Date(first);
  last.setUTCMonth(first.getUTCMonth() + 1, 0);
  const daysBefore = mondayIndex(first);
  const cellCount = Math.ceil((daysBefore + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => addDays(first, index - daysBefore));
}

function byDateAndTime(first, second) {
  return first.date.localeCompare(second.date) || first.time.localeCompare(second.time) || first.title.localeCompare(second.title);
}

function clockLabel(value) {
  const [hour, minute] = value.split(':');
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) >= 12 ? 'PM' : 'AM'}`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

function itemAttributes(item) {
  return `type="button" data-id="${escapeHTML(item.id)}" title="${escapeHTML(item.title)}"`;
}

function entryList(entries, formatDetail, emptyMessage) {
  if (!entries.length) {
    if (loading) return '<p class="empty">Loading entries…</p>';
    return loadError.hidden ? `<p class="empty">${emptyMessage}</p>` : '';
  }
  return `<div class="entry-list">${entries.map(item => `<button class="entry" ${itemAttributes(item)}>
    <span class="entry-title">${escapeHTML(item.title)}</span>
    <span class="entry-meta">${formatDetail(item)}</span>
  </button>`).join('')}</div>`;
}

function dayCard() {
  const key = iso(selected);
  const dayItems = items.filter(item => item.date === key).sort(byDateAndTime);
  const heading = `${dateFormat.weekday.format(selected)}, ${dateFormat.short.format(selected)}`;
  return `<section class="card day-card">
    <div class="card-heading"><h2>${heading}</h2>
      <button type="button" class="icon-button" data-action="new" title="New item" aria-label="Add item on ${dateFormat.full.format(selected)}">${icon('plus')}</button>
    </div>
    ${entryList(dayItems, item => item.time ? clockLabel(item.time) : 'All day', 'Nothing scheduled.')}
  </section>`;
}

function upcomingRange(today) {
  const start = addDays(parseDate(today), 1);
  return [start, addDays(start, 6)];
}

function upcomingCard(today) {
  const [start, end] = upcomingRange(today);
  const firstKey = iso(start);
  const lastKey = iso(end);
  const entries = items.filter(item => firstKey <= item.date && item.date <= lastKey).sort(byDateAndTime);
  const detail = item => [dateFormat.withWeekday.format(parseDate(item.date)), item.time && clockLabel(item.time)].filter(Boolean).join(' · ');
  return `<section class="card upcoming-card">
    <div class="card-heading"><h2>Upcoming</h2><p class="upcoming-range">${dateFormat.short.formatRange(start, end)}</p></div>
    ${entryList(entries, detail, 'Nothing scheduled in the next 7 days.')}
  </section>`;
}

function monthCell(day, today) {
  const key = iso(day);
  const dayItems = items.filter(item => item.date === key).sort(byDateAndTime);
  const isSelected = key === iso(selected);
  const isToday = key === today;
  const isOutside = day.getUTCMonth() !== selected.getUTCMonth();
  const cellClasses = `${isOutside ? ' outside' : ''}${isSelected ? ' day-highlight' : ''}`;
  const dateLabel = `${dateFormat.full.format(day)}${isToday ? ', today' : ''}`;
  const count = dayItems.length;
  const more = count > 2
    ? `<button type="button" class="month-more" data-date="${key}" aria-label="Show all ${count} items for ${dateLabel}">+${count - 2} more</button>`
    : '';
  return `<div class="month-cell${cellClasses}">
    <button type="button" class="month-date" data-date="${key}" aria-label="${dateLabel}" aria-pressed="${isSelected}"${isToday ? ' aria-current="date"' : ''}>${day.getUTCDate()}</button>
    <div class="month-items">${dayItems.slice(0, 2).map(item => `<button class="calendar-chip" ${itemAttributes(item)}><span class="chip-title">${escapeHTML(item.title)}</span></button>`).join('')}${more}</div>
    ${count ? '<span class="month-dot" aria-hidden="true"></span><span class="sr-only">Items scheduled</span>' : ''}
  </div>`;
}

function render() {
  const focused = layout.querySelector('button:focus');
  const today = todayKey();
  periodTitle.textContent = dateFormat.monthYear.format(selected);
  layout.innerHTML = `<section class="month-frame" aria-label="Monthly calendar">
    <div class="month-days">${weekdays.map(day => `<span>${day}</span>`).join('')}</div>
    <div class="month-grid">${monthDays(selected).map(day => monthCell(day, today)).join('')}</div>
  </section>
  <aside class="side-stack" aria-label="Calendar details">${dayCard()}${upcomingCard(today)}</aside>`;
  if (focused) {
    const section = focused.closest('section').classList.value.split(' ').at(-1);
    const key = Object.keys(focused.dataset)[0];
    const value = CSS.escape(focused.dataset[key]);
    layout.querySelector(`.${section} .${focused.classList[0]}[data-${key}="${value}"]`)?.focus({ preventScroll: true });
  }
}

function moveMonth(direction) {
  const target = firstOfMonth(selected);
  target.setUTCMonth(target.getUTCMonth() + direction);
  const last = new Date(target);
  last.setUTCMonth(target.getUTCMonth() + 1, 0);
  target.setUTCDate(Math.min(selected.getUTCDate(), last.getUTCDate()));
  selected = target;
}

function openEditor(item) {
  editingId = item?.id;
  document.querySelector('#dialog-title').textContent = item ? 'Edit item' : 'New item';
  dialog.querySelector('[data-action="remove"]').hidden = !item;
  const values = item ?? { date: iso(selected) };
  for (const name of ['title', 'date', 'time', 'notes']) {
    form.elements[name].value = values[name] ?? '';
  }
  form.elements.title.setCustomValidity('');
  itemError.hidden = true;
  dialog.showModal();
}

async function changeEntry(method, fields) {
  const url = editingId ? `/entries/${editingId}` : '/entries';
  saving = true;
  form.setAttribute('aria-busy', 'true');
  const controls = [...form.elements];
  controls.forEach(control => { control.disabled = true; });
  itemError.hidden = true;
  try {
    const saved = await requestEntries(url, { method, fields });
    items = items.filter(item => item.id !== editingId);
    if (saved) {
      items.push(saved);
      selected = parseDate(saved.date);
    }
    announcement.textContent = { POST: 'Item added.', PATCH: 'Item updated.', DELETE: 'Item removed.' }[method];
    dialog.close();
    render();
    layout.querySelector('[data-action="new"]').focus({ preventScroll: true });
    void refreshEntries();
  } catch (error) {
    itemError.textContent = error instanceof TypeError ? 'Couldn’t reach the calendar. Try again.' : error.message;
    itemError.hidden = false;
  } finally {
    saving = false;
    form.removeAttribute('aria-busy');
    controls.forEach(control => { control.disabled = false; });
  }
}

dialog.addEventListener('cancel', event => {
  if (saving) event.preventDefault();
});

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const { id, date, action } = button.dataset;
  if (id) {
    openEditor(items.find(item => String(item.id) === id));
  } else if (date) {
    const previousMonth = iso(selected).slice(0, 7);
    selected = parseDate(date);
    render();
    const focusTarget = button.classList.contains('month-more')
      ? layout.querySelector('.day-card .entry')
      : layout.querySelector('.month-date[aria-pressed="true"]');
    focusTarget?.focus({ preventScroll: true });
    if (date.slice(0, 7) !== previousMonth) void refreshEntries();
  } else if (action === 'new') {
    openEditor();
  } else if (action === 'close') {
    dialog.close();
  } else if (action === 'remove' && editingId && !saving) {
    void changeEntry('DELETE');
  } else if (action === 'retry') {
    void refreshEntries();
  } else if (['today', 'previous', 'next'].includes(action)) {
    if (action === 'today') selected = parseDate(todayKey());
    else moveMonth(action === 'next' ? 1 : -1);
    render();
    announcement.textContent = periodTitle.textContent;
    void refreshEntries();
  }
});

form.elements.title.addEventListener('input', () => form.elements.title.setCustomValidity(''));
form.addEventListener('submit', event => {
  event.preventDefault();
  if (saving) return;
  const fields = Object.fromEntries(new FormData(form));
  fields.title = fields.title.trim();
  if (!fields.title) {
    form.elements.title.setCustomValidity('Enter a title.');
    form.elements.title.reportValidity();
    return;
  }
  void changeEntry(editingId ? 'PATCH' : 'POST', fields);
});

for (const element of document.querySelectorAll('[data-icon]')) element.innerHTML = icon(element.dataset.icon);
render();
void refreshEntries();

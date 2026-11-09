"use strict";

const TASKS_KEY = "dayline.tasks.v1";
const DIARY_KEY = "dayline.diary.v1";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const elements = {
  storageState: document.querySelector("#storage-state"),
  todayButton: document.querySelector("#today-button"),
  monthLabel: document.querySelector("#month-label"),
  fullDate: document.querySelector("#full-date"),
  weekList: document.querySelector("#week-list"),
  previousWeek: document.querySelector("#previous-week"),
  nextWeek: document.querySelector("#next-week"),
  remainingCount: document.querySelector("#remaining-count"),
  weekCount: document.querySelector("#week-count"),
  completionRate: document.querySelector("#completion-rate"),
  taskEditor: document.querySelector("#task-editor"),
  editorTitle: document.querySelector("#editor-title"),
  openTaskEditor: document.querySelector("#open-task-editor"),
  closeTaskEditor: document.querySelector("#close-task-editor"),
  cancelTask: document.querySelector("#cancel-task"),
  taskForm: document.querySelector("#task-form"),
  taskId: document.querySelector("#task-id"),
  taskTitle: document.querySelector("#task-title"),
  taskDate: document.querySelector("#task-date"),
  taskTime: document.querySelector("#task-time"),
  taskPriority: document.querySelector("#task-priority"),
  taskNotes: document.querySelector("#task-notes"),
  taskSearch: document.querySelector("#task-search"),
  taskList: document.querySelector("#task-list"),
  filterButtons: [...document.querySelectorAll("[data-filter]")],
  diaryDateLabel: document.querySelector("#diary-date-label"),
  diaryTitle: document.querySelector("#diary-title"),
  diaryBody: document.querySelector("#diary-body"),
  diaryCount: document.querySelector("#diary-count"),
  diarySaveState: document.querySelector("#diary-save-state"),
  saveDiary: document.querySelector("#save-diary"),
  deleteDiary: document.querySelector("#delete-diary"),
  toast: document.querySelector("#toast"),
  toastMessage: document.querySelector("#toast-message"),
  toastAction: document.querySelector("#toast-action")
};

const state = {
  tasks: loadTasks(),
  diary: loadDiary(),
  selectedDate: dateKey(new Date()),
  weekOffset: 0,
  filter: "day",
  search: "",
  diaryTimer: null,
  toastTimer: null,
  undo: null
};

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date) {
  const start = new Date(date);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatDate(key, options) {
  return new Intl.DateTimeFormat("ko-KR", options).format(parseDate(key));
}

function isTask(value) {
  return value && typeof value.id === "string" && typeof value.title === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date);
}

function loadTasks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isTask).map(task => ({
      ...task,
      time: typeof task.time === "string" ? task.time : "",
      notes: typeof task.notes === "string" ? task.notes : "",
      priority: ["high", "normal", "low"].includes(task.priority) ? task.priority : "normal",
      completed: Boolean(task.completed)
    })) : [];
  } catch {
    return [];
  }
}

function loadDiary() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DIARY_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    elements.storageState.classList.remove("is-error");
    elements.storageState.lastChild.textContent = " 이 브라우저에 저장";
    return true;
  } catch {
    elements.storageState.classList.add("is-error");
    elements.storageState.lastChild.textContent = " 저장 공간을 사용할 수 없음";
    showToast("브라우저 저장 공간을 사용할 수 없습니다. 설정을 확인해 주세요.");
    return false;
  }
}

function persistTasks() {
  return persist(TASKS_KEY, state.tasks);
}

function persistDiary() {
  return persist(DIARY_KEY, state.diary);
}

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentWeekStart() {
  return addDays(startOfWeek(parseDate(state.selectedDate)), state.weekOffset * 7);
}

function taskCountForDate(key) {
  return state.tasks.filter(task => task.date === key && !task.completed).length;
}

function renderWeek() {
  const start = currentWeekStart();
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  elements.monthLabel.textContent = sameMonth
    ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(start)
    : `${start.getMonth() + 1}월 – ${end.getMonth() + 1}월`;
  elements.weekList.replaceChildren();

  for (let index = 0; index < 7; index += 1) {
    const date = addDays(start, index);
    const key = dateKey(date);
    const count = taskCountForDate(key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `day-button${key === dateKey(new Date()) ? " is-today" : ""}`;
    button.dataset.date = key;
    button.setAttribute("aria-pressed", String(key === state.selectedDate));
    button.setAttribute("aria-label", `${formatDate(key, { month: "long", day: "numeric", weekday: "long" })}, 남은 할 일 ${count}개`);

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(date.getDate());

    const meta = document.createElement("span");
    meta.className = "day-meta";
    const name = document.createElement("span");
    name.className = "day-name";
    name.textContent = WEEKDAYS[date.getDay()];
    const status = document.createElement("span");
    status.className = "day-status";
    status.textContent = key === dateKey(new Date()) ? "오늘" : count ? "일정 있음" : "비어 있음";
    meta.append(name, status);

    const badge = document.createElement("span");
    badge.className = "day-count";
    badge.textContent = String(count);
    badge.setAttribute("aria-hidden", "true");

    button.append(number, meta, badge);
    button.addEventListener("click", () => selectDate(key));
    elements.weekList.append(button);
  }
}

function renderHeading() {
  const selected = parseDate(state.selectedDate);
  const today = state.selectedDate === dateKey(new Date());
  elements.fullDate.textContent = formatDate(state.selectedDate, { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  document.querySelector("#task-heading").textContent = today ? "오늘의 흐름" : `${selected.getMonth() + 1}월 ${selected.getDate()}일의 흐름`;
  elements.diaryDateLabel.textContent = formatDate(state.selectedDate, { month: "long", day: "numeric", weekday: "long" });
}

function renderSummary() {
  const selectedRemaining = state.tasks.filter(task => task.date === state.selectedDate && !task.completed).length;
  const start = startOfWeek(parseDate(state.selectedDate));
  const endKey = dateKey(addDays(start, 6));
  const startKey = dateKey(start);
  const weekTasks = state.tasks.filter(task => task.date >= startKey && task.date <= endKey);
  const completeCount = state.tasks.filter(task => task.completed).length;
  const rate = state.tasks.length ? Math.round((completeCount / state.tasks.length) * 100) : 0;
  elements.remainingCount.textContent = String(selectedRemaining);
  elements.weekCount.textContent = String(weekTasks.length);
  elements.completionRate.textContent = `${rate}%`;
}

function visibleTasks() {
  const query = state.search.trim().toLocaleLowerCase("ko-KR");
  return state.tasks
    .filter(task => {
      if (state.filter === "day" && task.date !== state.selectedDate) return false;
      if (state.filter === "open" && task.completed) return false;
      if (state.filter === "completed" && !task.completed) return false;
      return !query || `${task.title} ${task.notes}`.toLocaleLowerCase("ko-KR").includes(query);
    })
    .sort((a, b) => {
      if (state.filter === "completed") return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      return `${a.date} ${a.time || "23:59"}`.localeCompare(`${b.date} ${b.time || "23:59"}`);
    });
}

function createIconButton(label, path, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.setAttribute("aria-label", label);
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`;
  button.addEventListener("click", handler);
  return button;
}

function renderTasks() {
  const tasks = visibleTasks();
  elements.taskList.replaceChildren();

  if (!tasks.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const title = state.search ? "검색 결과가 없습니다" : state.filter === "completed" ? "완료한 일이 아직 없습니다" : "이 시간선은 비어 있습니다";
    const copy = state.search ? "다른 검색어로 다시 찾아보세요." : "해야 할 일을 추가하면 날짜와 시간 순서로 정리됩니다.";
    empty.innerHTML = `<div class="empty-state-inner"><svg class="empty-route" viewBox="0 0 180 70" aria-hidden="true"><path d="M10 49C48 49 45 20 83 20s38 29 87 29"></path><circle cx="10" cy="49" r="5"></circle><circle cx="83" cy="20" r="5"></circle><circle cx="170" cy="49" r="5"></circle></svg><h3>${title}</h3><p>${copy}</p></div>`;
    if (!state.search && state.filter !== "completed") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button-primary";
      button.textContent = "첫 할 일 추가";
      button.addEventListener("click", () => openTaskEditor());
      empty.querySelector(".empty-state-inner").append(button);
    }
    elements.taskList.append(empty);
    return;
  }

  tasks.forEach(task => {
    const row = document.createElement("article");
    row.className = `task-row priority-${task.priority}${task.completed ? " is-completed" : ""}`;
    row.dataset.taskId = task.id;

    const time = document.createElement("time");
    time.className = "task-time";
    time.dateTime = `${task.date}${task.time ? `T${task.time}` : ""}`;
    time.textContent = task.time || "종일";

    const stop = document.createElement("span");
    stop.className = "timeline-stop";
    stop.setAttribute("aria-hidden", "true");

    const content = document.createElement("div");
    content.className = "task-content";
    const checkLine = document.createElement("label");
    checkLine.className = "task-check-line";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `${task.title} 완료 상태`);
    checkbox.addEventListener("change", () => toggleTask(task.id, checkbox.checked));
    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;
    checkLine.append(checkbox, title);
    content.append(checkLine);

    if (task.notes) {
      const notes = document.createElement("p");
      notes.className = "task-notes";
      notes.textContent = task.notes;
      content.append(notes);
    }
    if (state.filter !== "day") {
      const date = document.createElement("span");
      date.className = "task-date-label";
      date.textContent = formatDate(task.date, { month: "long", day: "numeric", weekday: "short" });
      content.append(date);
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.append(
      createIconButton("할 일 수정", "M4 20h4L19 9l-4-4L4 16v4M13.5 6.5l4 4", () => openTaskEditor(task)),
      createIconButton("할 일 삭제", "M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M6 7l1 14h10l1-14", () => deleteTask(task.id))
    );

    row.append(time, stop, content, actions);
    elements.taskList.append(row);
  });
}

function renderDiary() {
  const entry = state.diary[state.selectedDate] || { title: "", body: "" };
  elements.diaryTitle.value = entry.title || "";
  elements.diaryBody.value = entry.body || "";
  updateDiaryMeta(entry);
}

function updateDiaryMeta(entry) {
  elements.diaryCount.textContent = `${elements.diaryBody.value.length.toLocaleString("ko-KR")}자`;
  elements.deleteDiary.disabled = !entry.title && !entry.body;
  elements.diarySaveState.textContent = entry.updatedAt ? `저장됨 ${formatSavedTime(entry.updatedAt)}` : "작성 전";
  elements.diarySaveState.classList.toggle("is-saved", Boolean(entry.updatedAt));
}

function formatSavedTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function renderAll() {
  renderWeek();
  renderHeading();
  renderSummary();
  renderTasks();
  renderDiary();
}

function selectDate(key) {
  saveDiary(false);
  state.selectedDate = key;
  state.weekOffset = 0;
  if (!elements.taskEditor.hidden && !elements.taskId.value) elements.taskDate.value = key;
  renderAll();
}

function openTaskEditor(task = null) {
  elements.taskEditor.hidden = false;
  elements.taskEditor.classList.remove("is-opening");
  requestAnimationFrame(() => elements.taskEditor.classList.add("is-opening"));
  elements.taskId.value = task?.id || "";
  elements.editorTitle.textContent = task ? "할 일 수정" : "할 일 추가";
  elements.taskTitle.value = task?.title || "";
  elements.taskDate.value = task?.date || state.selectedDate;
  elements.taskTime.value = task?.time || "";
  elements.taskPriority.value = task?.priority || "normal";
  elements.taskNotes.value = task?.notes || "";
  elements.taskTitle.focus();
  elements.taskEditor.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
}

function closeTaskEditor() {
  elements.taskEditor.hidden = true;
  elements.taskEditor.classList.remove("is-opening");
  elements.taskForm.reset();
  elements.taskId.value = "";
  elements.openTaskEditor.focus();
}

function upsertTask(event) {
  event.preventDefault();
  const title = elements.taskTitle.value.trim();
  if (!title) {
    elements.taskTitle.setCustomValidity("할 일을 입력해 주세요.");
    elements.taskTitle.reportValidity();
    return;
  }
  elements.taskTitle.setCustomValidity("");
  const now = new Date().toISOString();
  const id = elements.taskId.value;
  const existing = state.tasks.find(task => task.id === id);
  const next = {
    id: existing?.id || makeId(),
    title,
    date: elements.taskDate.value,
    time: elements.taskTime.value,
    priority: elements.taskPriority.value,
    notes: elements.taskNotes.value.trim(),
    completed: existing?.completed || false,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  if (existing) state.tasks = state.tasks.map(task => task.id === id ? next : task);
  else state.tasks.push(next);
  persistTasks();
  state.selectedDate = next.date;
  state.weekOffset = 0;
  closeTaskEditor();
  renderAll();
  showToast(existing ? "일정을 수정했습니다." : "새 일정을 추가했습니다.");
}

function toggleTask(id, completed) {
  state.tasks = state.tasks.map(task => task.id === id ? { ...task, completed, updatedAt: new Date().toISOString() } : task);
  persistTasks();
  renderAll();
  const replacement = elements.taskList.querySelector(`[data-task-id="${CSS.escape(id)}"] input[type="checkbox"]`);
  if (replacement) replacement.focus();
  else elements.filterButtons.find(button => button.dataset.filter === state.filter)?.focus();
  showToast(completed ? "할 일을 완료했습니다." : "할 일을 다시 열었습니다.");
}

function deleteTask(id) {
  const index = state.tasks.findIndex(task => task.id === id);
  if (index === -1) return;
  const row = elements.taskList.querySelector(`[data-task-id="${CSS.escape(id)}"]`);
  const nearbyTaskId = row?.nextElementSibling?.dataset.taskId || row?.previousElementSibling?.dataset.taskId;
  const [removed] = state.tasks.splice(index, 1);
  persistTasks();
  renderAll();
  const nearbyAction = nearbyTaskId
    ? elements.taskList.querySelector(`[data-task-id="${CSS.escape(nearbyTaskId)}"] input[type="checkbox"]`)
    : null;
  (nearbyAction || elements.filterButtons.find(button => button.dataset.filter === state.filter))?.focus();
  showToast("할 일을 삭제했습니다.", () => {
    state.tasks.splice(index, 0, removed);
    persistTasks();
    renderAll();
    elements.taskList
      .querySelector(`[data-task-id="${CSS.escape(id)}"] button[aria-label="할 일 삭제"]`)
      ?.focus();
    showToast("삭제를 취소했습니다.");
  });
}

function diaryValue() {
  return { title: elements.diaryTitle.value.trim(), body: elements.diaryBody.value.trim() };
}

function saveDiary(notify = true) {
  clearTimeout(state.diaryTimer);
  const value = diaryValue();
  if (!value.title && !value.body) {
    delete state.diary[state.selectedDate];
    persistDiary();
    updateDiaryMeta({ title: "", body: "" });
    return;
  }
  const entry = { ...value, updatedAt: new Date().toISOString() };
  state.diary[state.selectedDate] = entry;
  const saved = persistDiary();
  updateDiaryMeta(entry);
  if (notify && saved) showToast("하루 기록을 저장했습니다.");
}

function scheduleDiarySave() {
  clearTimeout(state.diaryTimer);
  elements.diaryCount.textContent = `${elements.diaryBody.value.length.toLocaleString("ko-KR")}자`;
  elements.diarySaveState.textContent = "저장 대기";
  elements.diarySaveState.classList.remove("is-saved");
  state.diaryTimer = setTimeout(() => saveDiary(false), 800);
}

function deleteDiary() {
  const deletedDate = state.selectedDate;
  const removed = state.diary[deletedDate];
  if (!removed) return;
  delete state.diary[deletedDate];
  persistDiary();
  renderDiary();
  showToast("이 날짜의 기록을 지웠습니다.", () => {
    state.diary[deletedDate] = removed;
    persistDiary();
    if (state.selectedDate === deletedDate) renderDiary();
    showToast("기록을 복원했습니다.");
  });
}

function showToast(message, action = null) {
  clearTimeout(state.toastTimer);
  state.undo = action;
  elements.toastMessage.textContent = message;
  elements.toastAction.hidden = !action;
  elements.toast.hidden = false;
  elements.toast.classList.remove("is-showing");
  requestAnimationFrame(() => elements.toast.classList.add("is-showing"));
  state.toastTimer = setTimeout(hideToast, action ? 6000 : 2600);
}

function hideToast() {
  elements.toast.hidden = true;
  elements.toast.classList.remove("is-showing");
  state.undo = null;
}

elements.openTaskEditor.addEventListener("click", () => openTaskEditor());
elements.closeTaskEditor.addEventListener("click", closeTaskEditor);
elements.cancelTask.addEventListener("click", closeTaskEditor);
elements.taskForm.addEventListener("submit", upsertTask);
elements.todayButton.addEventListener("click", () => selectDate(dateKey(new Date())));
elements.previousWeek.addEventListener("click", () => { state.weekOffset -= 1; renderWeek(); });
elements.nextWeek.addEventListener("click", () => { state.weekOffset += 1; renderWeek(); });
elements.taskSearch.addEventListener("input", event => { state.search = event.target.value; renderTasks(); });
elements.filterButtons.forEach(button => button.addEventListener("click", () => {
  state.filter = button.dataset.filter;
  elements.filterButtons.forEach(item => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  renderTasks();
}));
elements.diaryTitle.addEventListener("input", scheduleDiarySave);
elements.diaryBody.addEventListener("input", scheduleDiarySave);
elements.saveDiary.addEventListener("click", () => saveDiary(true));
elements.deleteDiary.addEventListener("click", deleteDiary);
elements.toastAction.addEventListener("click", () => {
  const action = state.undo;
  hideToast();
  if (action) action();
});
window.addEventListener("beforeunload", () => saveDiary(false));

renderAll();

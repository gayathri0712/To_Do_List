
"use strict";

const $ = (id) => document.getElementById(id);

const taskInput = $("taskInput");
const priority = $("priority");
const dueDate = $("dueDate");
const taskList = $("taskList");
const search = $("search");
const taskForm = $("taskForm");
const addBtn = $("addBtn");
const themeBtn = $("themeBtn");
const clearAll = $("clearAll");
const priorityFilter = $("priorityFilter");
const sortTasks = $("sortTasks");
const formMessage = $("formMessage");

const STORAGE_KEY = "taskflow_pro_tasks";
const THEME_KEY = "taskflow_pro_theme";

let tasks = loadTasks();
let currentFilter = "all";
let editingId = null;
let messageTimer;

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

        if (!Array.isArray(saved)) return [];

        return saved
            .filter(task =>
                task &&
                typeof task.id === "string" &&
                typeof task.name === "string"
            )
            .map(task => ({
                id: task.id,
                name: task.name,
                priority: ["High", "Medium", "Low"].includes(task.priority)
                    ? task.priority : "Medium",
                due: typeof task.due === "string" ? task.due : "",
                completed: task.completed === true,
                createdAt: Number.isFinite(task.createdAt)
                    ? task.createdAt : Date.now()
            }));
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Could not save tasks:", error);
        showMessage("Could not save data. Check your browser storage.");
        return false;
    }
}

function showMessage(message, isSuccess = false) {
    clearTimeout(messageTimer);
    formMessage.textContent = message;
    formMessage.style.color = isSuccess ? "#159765" : "#e04f58";

    messageTimer = setTimeout(() => {
        formMessage.textContent = "";
    }, 3500);
}

function getToday() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString + "T12:00:00");

    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function isOverdue(task) {
    return Boolean(task.due && task.due < getToday() && !task.completed);
}

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ADD OR UPDATE TASK

taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = taskInput.value.trim();

    if (!name) {
        showMessage("Please enter a task name.");
        taskInput.focus();
        return;
    }

    if (name.length > 200) {
        showMessage("Task names must be 200 characters or fewer.");
        return;
    }

    const due = dueDate.value;

    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
        showMessage("Please select a valid due date.");
        return;
    }

    if (editingId) {
        const task = tasks.find(item => item.id === editingId);

        if (!task) {
            editingId = null;
            showMessage("Task not found. Please try again.");
            return;
        }

        const oldTask = { ...task };

        task.name = name;
        task.priority = priority.value;
        task.due = due;

        if (!saveTasks()) {
            Object.assign(task, oldTask);
            return;
        }

        editingId = null;
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Task';
        showMessage("Task updated successfully!", true);
    } else {
        const task = {
            id: createId(),
            name,
            priority: priority.value,
            due,
            completed: false,
            createdAt: Date.now()
        };

        tasks.push(task);

        if (!saveTasks()) {
            tasks.pop();
            return;
        }

        showMessage("Task added successfully!", true);
    }

    taskInput.value = "";
    dueDate.value = "";
    priority.value = "Medium";

    render();
    taskInput.focus();
});

// SEARCH, FILTER AND SORT

search.addEventListener("input", render);
priorityFilter.addEventListener("change", render);
sortTasks.addEventListener("change", render);

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        document.querySelectorAll(".nav-item").forEach(item => {
            const active = item === button;
            item.classList.toggle("active", active);
            item.setAttribute("aria-pressed", String(active));
        });

        render();
    });
});

// TASK ACTIONS USING EVENT DELEGATION

taskList.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const item = button.closest("li[data-id]");
    if (!item) return;

    const task = tasks.find(task => task.id === item.dataset.id);
    if (!task) return;

    const action = button.dataset.action;

    if (action === "edit") {
        editingId = task.id;
        taskInput.value = task.name;
        priority.value = task.priority;
        dueDate.value = task.due;

        addBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Task';

        taskInput.focus();
        $("taskForm").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        showMessage("Edit your task and click Save Task.", true);
    }

    if (action === "delete") {
        if (!confirm(`Delete "${task.name}"?`)) return;

        const oldTasks = [...tasks];
        tasks = tasks.filter(item => item.id !== task.id);

        if (!saveTasks()) {
            tasks = oldTasks;
            return;
        }

        if (editingId === task.id) resetForm();

        render();
        showMessage("Task deleted.", true);
    }
});

taskList.addEventListener("change", function (event) {
    if (!event.target.matches('input[data-action="toggle"]')) return;

    const item = event.target.closest("li[data-id]");
    if (!item) return;

    const task = tasks.find(task => task.id === item.dataset.id);
    if (!task) return;

    const previousValue = task.completed;
    task.completed = event.target.checked;

    if (!saveTasks()) {
        task.completed = previousValue;
        event.target.checked = previousValue;
        return;
    }

    render();
    showMessage(
        task.completed ? "Great work! Task completed." : "Task marked as pending.",
        true
    );
});

function resetForm() {
    editingId = null;
    taskForm.reset();
    priority.value = "Medium";
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Task';
}

// CLEAR ALL

clearAll.addEventListener("click", () => {
    if (tasks.length === 0) {
        showMessage("There are no tasks to clear.");
        return;
    }

    if (!confirm(`Delete all ${tasks.length} tasks? This cannot be undone.`)) {
        return;
    }

    const oldTasks = tasks;
    tasks = [];

    if (!saveTasks()) {
        tasks = oldTasks;
        return;
    }

    resetForm();
    render();
    showMessage("All tasks cleared.", true);
});

// BUILD TASK ELEMENTS SAFELY

function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function makeActionButton(action, iconClass, label, extraClass = "") {
    const button = document.createElement("button");

    button.type = "button";
    button.dataset.action = action;
    button.setAttribute("aria-label", label);
    button.title = label;

    if (extraClass) button.classList.add(extraClass);

    const icon = document.createElement("i");
    icon.className = iconClass;
    button.appendChild(icon);

    return button;
}

function createTaskElement(task) {
    const li = makeElement("li", "task");
    li.dataset.id = task.id;

    if (task.completed) li.classList.add("completed");

    const main = makeElement("div", "task-main");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;
    checkbox.dataset.action = "toggle";
    checkbox.setAttribute("aria-label", `Complete ${task.name}`);

    const info = makeElement("div", "task-info");
    const title = makeElement("h4", "", task.name);
    const meta = makeElement("div", "task-meta");

    const priorityClass = task.priority.toLowerCase();
    const priorityBadge = makeElement(
        "span",
        `priority-badge priority-${priorityClass}`,
        task.priority + " priority"
    );

    meta.appendChild(priorityBadge);

    if (task.due) {
        const overdue = isOverdue(task);
        const today = task.due === getToday() && !task.completed;

        let dateLabel = `Due ${formatDate(task.due)}`;
        let dateClass = "status-badge";

        if (overdue) {
            dateLabel = `Overdue · ${formatDate(task.due)}`;
            dateClass += " overdue";
        } else if (today) {
            dateLabel = `Due today · ${formatDate(task.due)}`;
            dateClass += " today";
        } else {
            dateLabel = `Due ${formatDate(task.due)}`;
        }

        meta.appendChild(makeElement("span", dateClass, dateLabel));
    }

    if (task.completed) {
        meta.appendChild(makeElement("span", "status-badge", "Completed"));
    }

    info.append(title, meta);
    main.append(checkbox, info);

    const actions = makeElement("div", "actions");

    actions.append(
        makeActionButton("edit", "fa-solid fa-pen", "Edit task"),
        makeActionButton("delete", "fa-regular fa-trash-can", "Delete task", "delete")
    );

    li.append(main, actions);

    return li;
}

function render() {
    taskList.replaceChildren();

    const keyword = search.value.trim().toLowerCase();
    const selectedPriority = priorityFilter.value;

    let filtered = tasks.filter(task => {
        const matchesSearch = task.name.toLowerCase().includes(keyword);
        const matchesPriority =
            selectedPriority === "all" || task.priority === selectedPriority;

        const matchesStatus =
            currentFilter === "all" ||
            (currentFilter === "completed" && task.completed) ||
            (currentFilter === "pending" && !task.completed);

        return matchesSearch && matchesPriority && matchesStatus;
    });

    const priorityRank = { High: 3, Medium: 2, Low: 1 };

    filtered.sort((a, b) => {
        switch (sortTasks.value) {
            case "oldest":
                return a.createdAt - b.createdAt;

            case "due":
                if (!a.due && !b.due) return b.createdAt - a.createdAt;
                if (!a.due) return 1;
                if (!b.due) return -1;
                return a.due.localeCompare(b.due);

            case "priority":
                return priorityRank[b.priority] - priorityRank[a.priority]
                    || b.createdAt - a.createdAt;

            case "newest":
            default:
                return b.createdAt - a.createdAt;
        }
    });

    if (filtered.length === 0) {
        const empty = makeElement("li", "empty-state");
        const icon = makeElement("i", "fa-solid fa-clipboard-check");
        const heading = makeElement("h3", "", tasks.length
            ? "No matching tasks"
            : "Your workspace is ready!");

        const description = makeElement("p", "", tasks.length
            ? "Try changing your search or filters."
            : "Add your first task above and start making progress.");

        empty.append(icon, heading, description);
        taskList.appendChild(empty);
    } else {
        filtered.forEach(task => {
            taskList.appendChild(createTaskElement(task));
        });
    }

    updateStats();

    $("resultCount").textContent =
        `${filtered.length} ${filtered.length === 1 ? "task" : "tasks"}`;
}

// STATISTICS

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const overdue = tasks.filter(isOverdue).length;

    $("totalTasks").textContent = total;
    $("completedTasks").textContent = completed;
    $("pendingTasks").textContent = pending;
    $("overdueTasks").textContent = overdue;
    $("navTotal").textContent = total;

    const percent = total ? Math.round(completed / total * 100) : 0;

    $("progress").style.width = `${percent}%`;
    $("progressText").textContent = `${percent}%`;
    $("progress").setAttribute("role", "progressbar");
    $("progress").setAttribute("aria-valuemin", "0");
    $("progress").setAttribute("aria-valuemax", "100");
    $("progress").setAttribute("aria-valuenow", String(percent));
}

// THEME

function applyTheme(theme) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark", isDark);

    themeBtn.innerHTML = isDark
        ? '<i class="fa-solid fa-sun"></i><span>Light mode</span>'
        : '<i class="fa-solid fa-moon"></i><span>Dark mode</span>';

    themeBtn.setAttribute("aria-pressed", String(isDark));
}

try {
    applyTheme(localStorage.getItem(THEME_KEY) || "light");
} catch (error) {
    applyTheme("light");
}

themeBtn.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark")
        ? "light"
        : "dark";

    applyTheme(nextTheme);

    try {
        localStorage.setItem(THEME_KEY, nextTheme);
    } catch (error) {
        console.warn("Theme preference could not be saved.");
    }
});

// DATE AND INITIAL DISPLAY

$("todayDate").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
});

dueDate.min = getToday();

render();

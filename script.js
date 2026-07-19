const taskInput = document.getElementById("taskInput");
const priority = document.getElementById("priority");
const dueDate = document.getElementById("dueDate");
const taskList = document.getElementById("taskList");
const search = document.getElementById("search");
const addBtn = document.getElementById("addBtn");
const themeBtn = document.getElementById("themeBtn");
const clearAll = document.getElementById("clearAll");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentFilter = "all";

// ---------- Add Task ----------

function addTask() {

    const name = taskInput.value.trim();

    if (name === "") {
        alert("Please enter a task!");
        return;
    }

    const task = {
        id: Date.now(),
        name: name,
        priority: priority.value,
        due: dueDate.value,
        completed: false
    };

    tasks.push(task);

    saveTasks();

    taskInput.value = "";
    dueDate.value = "";

    displayTasks();

}

addBtn.addEventListener("click", addTask);

taskInput.addEventListener("keypress", function (e) {

    if (e.key === "Enter") {
        addTask();
    }

});

// ---------- Display ----------

function displayTasks() {

    taskList.innerHTML = "";

    let keyword = search.value.toLowerCase();

    let filtered = tasks.filter(task => {

        let searchMatch = task.name.toLowerCase().includes(keyword);

        if (currentFilter === "completed")
            return searchMatch && task.completed;

        if (currentFilter === "pending")
            return searchMatch && !task.completed;

        return searchMatch;

    });

    filtered.forEach(task => {

        const li = document.createElement("li");

        li.className = "task";

        if (task.completed)
            li.classList.add("completed");

        li.innerHTML = `

        <div class="task-info">

            <h3>${task.name}</h3>

            <p>

                <span class="priority ${task.priority.toLowerCase()}">
                    ${task.priority}
                </span>

                ${task.due ? " | 📅 " + task.due : ""}

            </p>

        </div>

        <div class="actions">

            <button class="complete">

                ✔

            </button>

            <button class="edit">

                ✏

            </button>

            <button class="delete">

                🗑

            </button>

        </div>

        `;

        // Complete

        li.querySelector(".complete").onclick = () => {

            task.completed = !task.completed;

            saveTasks();

            displayTasks();

        };

        // Edit

        li.querySelector(".edit").onclick = () => {

            let newTask = prompt("Edit Task", task.name);

            if (newTask && newTask.trim() !== "") {

                task.name = newTask.trim();

                saveTasks();

                displayTasks();

            }

        };

        // Delete

        li.querySelector(".delete").onclick = () => {

            if (confirm("Delete this task?")) {

                tasks = tasks.filter(t => t.id !== task.id);

                saveTasks();

                displayTasks();

            }

        };

        taskList.appendChild(li);

    });

    updateStats();

}

// ---------- Search ----------

search.addEventListener("keyup", displayTasks);

// ---------- Filter ----------

document.querySelectorAll(".filter").forEach(button => {

    button.addEventListener("click", () => {

        document.querySelectorAll(".filter").forEach(btn =>

            btn.classList.remove("active")

        );

        button.classList.add("active");

        currentFilter = button.dataset.filter;

        displayTasks();

    });

});

// ---------- Clear All ----------

clearAll.addEventListener("click", () => {

    if (tasks.length === 0) {

        alert("No tasks available.");

        return;

    }

    if (confirm("Delete all tasks?")) {

        tasks = [];

        saveTasks();

        displayTasks();

    }

});

// ---------- Save ----------

function saveTasks() {

    localStorage.setItem("tasks", JSON.stringify(tasks));

}

// ---------- Statistics ----------

function updateStats() {

    let total = tasks.length;

    let completed = tasks.filter(task => task.completed).length;

    let pending = total - completed;

    document.getElementById("totalTasks").innerText = total;

    document.getElementById("completedTasks").innerText = completed;

    document.getElementById("pendingTasks").innerText = pending;

    let percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    document.getElementById("progress").style.width = percent + "%";

    document.getElementById("progressText").innerText = percent + "% Completed";

}

// ---------- Theme ----------

if (localStorage.getItem("theme") === "dark") {

    document.body.classList.add("dark");

}

themeBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    localStorage.setItem(

        "theme",

        document.body.classList.contains("dark") ? "dark" : "light"

    );

});

// ---------- Initial ----------

displayTasks();
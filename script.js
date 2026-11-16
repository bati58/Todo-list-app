
document.addEventListener("DOMContentLoaded", () => {

    // 1. DOM ELEMENTS

    const taskForm = document.getElementById("taskForm");
    const taskInput = document.getElementById("taskInput");
    const taskList = document.getElementById("taskList");
    const searchInput = document.getElementById("searchInput");

    const totalTasks = document.getElementById("totalTasks");
    const activeTasks = document.getElementById("activeTasks");
    const completedTasks = document.getElementById("completedTasks");

    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");

    const emptyState = document.getElementById("emptyState");
    const clearCompleted = document.getElementById("clearCompleted");
    const filterButtons = document.querySelectorAll(".filter-btn");

    // Modal elements
    const confirmModal = document.getElementById("confirmModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalMessage = document.getElementById("modalMessage");
    const cancelModal = document.getElementById("cancelModal");
    const confirmAction = document.getElementById("confirmAction");

    // Check that required HTML elements exist
    const requiredElements = [
        taskForm, taskInput, taskList, searchInput,
        totalTasks, activeTasks, completedTasks,
        progressBar, progressText, emptyState,
        clearCompleted, confirmModal, modalTitle,
        modalMessage, cancelModal, confirmAction
    ];

    if (requiredElements.some(element => !element)) {
        console.error("Some required HTML elements are missing.");
        return;
    }


    // 2. APPLICATION STATE

    let tasks = loadTasks();
    let currentFilter = "all";
    let searchTerm = "";
    let editingTaskId = null;
    let pendingAction = null;


    // 3. LOAD TASKS FROM LOCAL STORAGE

    function loadTasks() {
        try {
            // Support both the old and current storage keys
            const savedData =
                localStorage.getItem("tasks") ??
                localStorage.getItem("task");

            const savedTasks = JSON.parse(savedData || "[]");

            if (!Array.isArray(savedTasks)) {
                return [];
            }

            // Keep valid old tasks and normalize their IDs
            return savedTasks
                .filter(task =>
                    task &&
                    (typeof task.id === "string" ||
                     typeof task.id === "number") &&
                    typeof task.text === "string"
                )
                .map(task => ({
                    id: String(task.id),
                    text: task.text,
                    completed: task.completed === true,
                    createdAt: task.createdAt || new Date().toISOString()
                }));

        } catch (error) {
            console.error("Could not load tasks:", error);
            return [];
        }
    }


    // 4. SAVE TASKS

    function saveTasks() {
        try {
            localStorage.setItem("tasks", JSON.stringify(tasks));
        } catch (error) {
            console.error("Could not save tasks:", error);
        }
    }


    // 5. CONFIRMATION MODAL

    function showConfirmModal(title, message, buttonText, action) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        confirmAction.textContent = buttonText;

        pendingAction = action;
        confirmModal.classList.add("active");

        confirmAction.focus();
    }

    function closeConfirmModal() {
        confirmModal.classList.remove("active");
        pendingAction = null;
    }

    cancelModal.addEventListener("click", closeConfirmModal);

    confirmAction.addEventListener("click", () => {
        if (typeof pendingAction === "function") {
            const action = pendingAction;
            closeConfirmModal();
            action();
        }
    });

    // Close when clicking outside the dialog
    confirmModal.addEventListener("click", (event) => {
        if (event.target === confirmModal) {
            closeConfirmModal();
        }
    });

    // Close modal with Escape
    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            confirmModal.classList.contains("active")
        ) {
            closeConfirmModal();
        }
    });


    // 6. ADD NEW TASK

    taskForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const text = taskInput.value.trim();

        if (!text) return;

        const newTask = {
            id: crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
            text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        tasks.unshift(newTask);

        saveTasks();

        taskInput.value = "";
        currentFilter = "all";
        searchTerm = "";
        searchInput.value = "";
        editingTaskId = null;

        updateFilterButtons();
        renderTasks();

        taskInput.focus();
    });


    // 7. DISPLAY TASKS

    function renderTasks() {
        taskList.innerHTML = "";

        const filteredTasks = tasks.filter(task => {

            const matchesFilter =
                currentFilter === "all" ||
                (currentFilter === "active" && !task.completed) ||
                (currentFilter === "completed" && task.completed);

            const matchesSearch = task.text
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

            return matchesFilter && matchesSearch;
        });

        filteredTasks.forEach(task => {

            const li = document.createElement("li");
            li.className = "task-item";
            li.dataset.id = task.id;

            if (task.completed) {
                li.classList.add("completed");
            }

            // Inline editing mode
            if (editingTaskId === task.id) {

                const editForm = document.createElement("form");
                editForm.className = "edit-form";

                editForm.innerHTML = `
                    <input
                        class="edit-input"
                        type="text"
                        maxlength="150"
                        required
                        aria-label="Edit task"
                    >

                    <button class="action-btn save-btn" type="submit">
                        Save
                    </button>

                    <button
                        class="action-btn cancel-btn"
                        type="button"
                        data-action="cancel"
                    >
                        Cancel
                    </button>
                `;

                const editInput = editForm.querySelector(".edit-input");
                editInput.value = task.text;

                li.appendChild(editForm);
                taskList.appendChild(li);

                requestAnimationFrame(() => {
                    editInput.focus();
                    editInput.select();
                });

                return;
            }

            // Complete button
            const completeButton = document.createElement("button");

            completeButton.className = "complete-btn";
            completeButton.type = "button";
            completeButton.dataset.action = "toggle";
            completeButton.textContent = task.completed ? "✓" : "";

            completeButton.setAttribute(
                "aria-label",
                task.completed ? "Mark active" : "Mark completed"
            );

            // Task text
            const taskText = document.createElement("span");

            taskText.className = "task-text";
            taskText.textContent = task.text;

            // Action buttons
            const actions = document.createElement("div");
            actions.className = "task-actions";

            const editButton = document.createElement("button");
            editButton.className = "action-btn edit-btn";
            editButton.type = "button";
            editButton.dataset.action = "edit";
            editButton.textContent = "Edit";

            const deleteButton = document.createElement("button");
            deleteButton.className = "action-btn delete-btn";
            deleteButton.type = "button";
            deleteButton.dataset.action = "delete";
            deleteButton.textContent = "Delete";

            actions.append(editButton, deleteButton);

            li.append(completeButton, taskText, actions);
            taskList.appendChild(li);
        });

        // Empty state
        emptyState.style.display =
            filteredTasks.length === 0 ? "block" : "none";

        updateStatistics();
    }


    // 8. UPDATE STATISTICS AND PROGRESS

    function updateStatistics() {

        const total = tasks.length;

        const completed = tasks.filter(
            task => task.completed
        ).length;

        const active = total - completed;

        const progress = total === 0
            ? 0
            : Math.round((completed / total) * 100);

        totalTasks.textContent = total;
        activeTasks.textContent = active;
        completedTasks.textContent = completed;

        progressText.textContent = `${progress}%`;
        progressBar.style.width = `${progress}%`;
    }


    // 9. TASK ACTIONS (COMPLETE, EDIT, DELETE, CANCEL)

    taskList.addEventListener("click", (event) => {

        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const li = button.closest(".task-item");

        if (!li) return;

        const taskId = li.dataset.id;

        const task = tasks.find(
            item => item.id === taskId
        );

        if (!task) return;


        // Complete or uncomplete task
        if (action === "toggle") {

            task.completed = !task.completed;

            saveTasks();
            renderTasks();
        }


        // Edit task
        else if (action === "edit") {

            editingTaskId = taskId;
            renderTasks();
        }


        // Delete task with confirmation
        else if (action === "delete") {

            showConfirmModal(
                "Delete this task?",
                `Are you sure you want to delete "${task.text}"? This action cannot be undone.`,
                "Delete task",
                () => {

                    tasks = tasks.filter(
                        item => item.id !== taskId
                    );

                    if (editingTaskId === taskId) {
                        editingTaskId = null;
                    }

                    saveTasks();
                    renderTasks();
                }
            );
        }


        // Cancel editing
        else if (action === "cancel") {

            editingTaskId = null;
            renderTasks();
        }
    });


    // 10. SAVE EDITED TASK

    taskList.addEventListener("submit", (event) => {

        if (!event.target.matches(".edit-form")) return;

        event.preventDefault();

        const li = event.target.closest(".task-item");
        const taskId = li.dataset.id;

        const editInput = event.target.querySelector(".edit-input");
        const updatedText = editInput.value.trim();

        if (!updatedText) {
            editInput.focus();
            return;
        }

        const task = tasks.find(
            item => item.id === taskId
        );

        if (!task) return;

        task.text = updatedText;

        editingTaskId = null;

        saveTasks();
        renderTasks();
    });


    // 11. SEARCH TASKS

    searchInput.addEventListener("input", () => {

        searchTerm = searchInput.value.trim();

        renderTasks();
    });


    // 12. FILTER TASKS

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            currentFilter = button.dataset.filter;
            editingTaskId = null;

            updateFilterButtons();
            renderTasks();
        });
    });

    function updateFilterButtons() {

        filterButtons.forEach(button => {

            const isActive =
                button.dataset.filter === currentFilter;

            button.classList.toggle("active", isActive);

            button.setAttribute(
                "aria-pressed",
                String(isActive)
            );
        });
    }


    // 13. CLEAR COMPLETED TASKS

    clearCompleted.addEventListener("click", () => {

        const completedCount = tasks.filter(
            task => task.completed
        ).length;

        // Nothing to clear
        if (completedCount === 0) return;

        showConfirmModal(
            "Clear completed tasks?",
            `You are about to delete all ${completedCount} completed tasks. This action cannot be undone.`,
            "Clear completed",
            () => {

                tasks = tasks.filter(
                    task => !task.completed
                );

                editingTaskId = null;

                saveTasks();
                renderTasks();
            }
        );
    });


    // 14. KEYBOARD SUPPORT

    taskList.addEventListener("keydown", (event) => {

        if (
            event.key === "Escape" &&
            event.target.classList.contains("edit-input")
        ) {
            editingTaskId = null;
            renderTasks();
        }
    });


    // 15. INITIALIZE APPLICATION

    updateFilterButtons();
    renderTasks();

});

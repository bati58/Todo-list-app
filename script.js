
document.addEventListener("DOMContentLoaded", () => {

    // 1. DOM ELEMENTS

    const taskForm = document.getElementById("taskForm");
    const taskInput = document.getElementById("taskInput");
    const taskList = document.getElementById("taskList");
    const searchInput = document.getElementById("searchInput");

    const totalTasks = document.getElementById("totalTasks");
    const activeTasks = document.getElementById("activeTasks");
    const completedTasks = document.getElementById("completedTasks");

    const progressTrack = document.getElementById("progressTrack");
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

    // Check required HTML elements
    const requiredElements = [
        taskForm,
        taskInput,
        taskList,
        searchInput,
        totalTasks,
        activeTasks,
        completedTasks,
        progressTrack,
        progressBar,
        progressText,
        emptyState,
        clearCompleted,
        confirmModal,
        modalTitle,
        modalMessage,
        cancelModal,
        confirmAction
    ];

    if (requiredElements.some(element => !element)) {
        console.error("Application initialization failed: required HTML elements are missing.");
        return;
    }


     // 2. APPLICATION STATE

    let tasks = loadTasks();

    let currentFilter = "all";
    let searchTerm = "";
    let editingTaskId = null;

    let pendingAction = null;
    let previousFocusedElement = null;


    // 3. LOCAL STORAGE

    function loadTasks() {
        try {
            // Support the current and previous storage keys
            const savedData =
                localStorage.getItem("tasks") ??
                localStorage.getItem("task");

            if (!savedData) {
                return [];
            }

            const savedTasks = JSON.parse(savedData);

            if (!Array.isArray(savedTasks)) {
                return [];
            }

            return savedTasks
                .filter(task =>
                    task &&
                    (typeof task.id === "string" ||
                     typeof task.id === "number") &&
                    typeof task.text === "string" &&
                    task.text.trim() !== ""
                )
                .map(task => ({
                    id: String(task.id),
                    text: task.text.trim(),
                    completed: task.completed === true,
                    createdAt:
                        typeof task.createdAt === "string"
                            ? task.createdAt
                            : new Date().toISOString()
                }));

        } catch (error) {
            console.error("Could not load tasks from local storage:", error);
            return [];
        }
    }


    function saveTasks() {
        try {
            localStorage.setItem("tasks", JSON.stringify(tasks));
            return true;

        } catch (error) {
            console.error("Could not save tasks to local storage:", error);
            return false;
        }
    }


    // 4. HELPER FUNCTIONS

    function generateTaskId() {
        if (
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
        ) {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }


    function findTask(taskId) {
        return tasks.find(task => task.id === taskId);
    }


    function updateFilterButtons() {
        filterButtons.forEach(button => {
            const isActive = button.dataset.filter === currentFilter;

            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }


    // 5. CONFIRMATION MODAL

    function showConfirmModal(title, message, buttonText, action) {
        previousFocusedElement = document.activeElement;

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        confirmAction.textContent = buttonText;

        pendingAction = action;

        confirmModal.classList.add("active");
        confirmModal.setAttribute("aria-hidden", "false");

        confirmAction.focus();
    }


    function closeConfirmModal() {
        confirmModal.classList.remove("active");
        confirmModal.setAttribute("aria-hidden", "true");

        pendingAction = null;

        // Return focus to the element that opened the modal
        if (
            previousFocusedElement &&
            previousFocusedElement.isConnected
        ) {
            previousFocusedElement.focus();
        } else {
            taskInput.focus();
        }

        previousFocusedElement = null;
    }


    cancelModal.addEventListener("click", closeConfirmModal);


    confirmAction.addEventListener("click", () => {
        if (typeof pendingAction !== "function") {
            return;
        }

        const action = pendingAction;

        closeConfirmModal();
        action();
    });


    // Close modal when clicking outside its content
    confirmModal.addEventListener("click", event => {
        if (event.target === confirmModal) {
            closeConfirmModal();
        }
    });


    // Modal keyboard support
    document.addEventListener("keydown", event => {
        if (!confirmModal.classList.contains("active")) {
            return;
        }

        // Close modal with Escape
        if (event.key === "Escape") {
            event.preventDefault();
            closeConfirmModal();
            return;
        }

        // Keep keyboard focus inside the modal
        if (event.key === "Tab") {
            const focusableElements = [
                cancelModal,
                confirmAction
            ];

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();

            } else if (
                !event.shiftKey &&
                document.activeElement === lastElement
            ) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    });


    // 6. UPDATE STATISTICS

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

        progressTrack.setAttribute("aria-valuenow", progress);
    }


    // 7. RENDER TASKS

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
            const listItem = document.createElement("li");

            listItem.className = "task-item";
            listItem.dataset.id = task.id;

            if (task.completed) {
                listItem.classList.add("completed");
            }


            // Inline editing mode
            if (editingTaskId === task.id) {
                const editForm = document.createElement("form");
                editForm.className = "edit-form";

                const editInput = document.createElement("input");
                editInput.type = "text";
                editInput.className = "edit-input";
                editInput.maxLength = 150;
                editInput.required = true;
                editInput.value = task.text;
                editInput.setAttribute("aria-label", "Edit task");

                const saveButton = document.createElement("button");
                saveButton.type = "submit";
                saveButton.className = "action-btn save-btn";
                saveButton.textContent = "Save";

                const cancelButton = document.createElement("button");
                cancelButton.type = "button";
                cancelButton.className = "action-btn cancel-btn";
                cancelButton.dataset.action = "cancel";
                cancelButton.textContent = "Cancel";

                editForm.append(editInput, saveButton, cancelButton);
                listItem.appendChild(editForm);
                taskList.appendChild(listItem);

                requestAnimationFrame(() => {
                    editInput.focus();
                    editInput.select();
                });

                return;
            }


            // Complete button
            const completeButton = document.createElement("button");

            completeButton.type = "button";
            completeButton.className = "complete-btn";
            completeButton.dataset.action = "toggle";
            completeButton.textContent = task.completed ? "✓" : "";

            completeButton.setAttribute(
                "aria-label",
                task.completed ? "Mark task as active" : "Mark task as completed"
            );


            // Task text
            const taskText = document.createElement("span");

            taskText.className = "task-text";
            taskText.textContent = task.text;


            // Task action buttons
            const actions = document.createElement("div");
            actions.className = "task-actions";

            const editButton = document.createElement("button");

            editButton.type = "button";
            editButton.className = "action-btn edit-btn";
            editButton.dataset.action = "edit";
            editButton.textContent = "Edit";

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.className = "action-btn delete-btn";
            deleteButton.dataset.action = "delete";
            deleteButton.textContent = "Delete";

            actions.append(editButton, deleteButton);

            listItem.append(completeButton, taskText, actions);
            taskList.appendChild(listItem);
        });


        // Show empty state when there are no matching tasks
        emptyState.style.display =
            filteredTasks.length === 0 ? "block" : "none";

        updateStatistics();
    }


    // 8. ADD TASK

    taskForm.addEventListener("submit", event => {
        event.preventDefault();

        const text = taskInput.value.trim();

        if (!text) {
            taskInput.focus();
            return;
        }

        const newTask = {
            id: generateTaskId(),
            text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        tasks.unshift(newTask);

        saveTasks();

        taskInput.value = "";

        // Show the newly added task
        currentFilter = "all";
        searchTerm = "";
        searchInput.value = "";
        editingTaskId = null;

        updateFilterButtons();
        renderTasks();

        taskInput.focus();
    });


    // 9. TASK ACTIONS

    taskList.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button || !taskList.contains(button)) {
            return;
        }

        const listItem = button.closest(".task-item");

        if (!listItem) {
            return;
        }

        const taskId = listItem.dataset.id;
        const action = button.dataset.action;

        const task = findTask(taskId);

        if (!task) {
            return;
        }


        // Complete or uncomplete a task
        if (action === "toggle") {
            task.completed = !task.completed;

            saveTasks();
            renderTasks();
            return;
        }


        // Start editing
        if (action === "edit") {
            editingTaskId = taskId;

            renderTasks();
            return;
        }


        // Cancel editing
        if (action === "cancel") {
            editingTaskId = null;

            renderTasks();

            // Return focus to the task's Edit button
            const editButton = taskList.querySelector(
                `.task-item[data-id="${CSS.escape(taskId)}"] [data-action="edit"]`
            );

            editButton?.focus();
            return;
        }


        // Delete task with confirmation
        if (action === "delete") {
            showConfirmModal(
                "Delete this task?",
                `Are you sure you want to delete "${task.text}"? This action cannot be undone.`,
                "Delete task",
                () => {
                    tasks = tasks.filter(item => item.id !== taskId);

                    if (editingTaskId === taskId) {
                        editingTaskId = null;
                    }

                    saveTasks();
                    renderTasks();
                }
            );
        }
    });


    // 10. SAVE EDITED TASK

    taskList.addEventListener("submit", event => {
        if (!event.target.matches(".edit-form")) {
            return;
        }

        event.preventDefault();

        const listItem = event.target.closest(".task-item");

        if (!listItem) {
            return;
        }

        const taskId = listItem.dataset.id;
        const editInput = event.target.querySelector(".edit-input");
        const updatedText = editInput.value.trim();

        if (!updatedText) {
            editInput.focus();
            return;
        }

        const task = findTask(taskId);

        if (!task) {
            return;
        }

        task.text = updatedText;
        editingTaskId = null;

        saveTasks();
        renderTasks();
    });


    // 11. SEARCH TASKS

    searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value.trim();

        // Stop editing when searching
        editingTaskId = null;

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


    // 13. CLEAR COMPLETED TASKS

    clearCompleted.addEventListener("click", () => {
        const completedCount = tasks.filter(
            task => task.completed
        ).length;

        if (completedCount === 0) {
            return;
        }

        showConfirmModal(
            "Clear completed tasks?",
            `You are about to delete all ${completedCount} completed tasks. This action cannot be undone.`,
            "Clear completed",
            () => {
                tasks = tasks.filter(task => !task.completed);

                editingTaskId = null;

                saveTasks();
                renderTasks();
            }
        );
    });


    // 14. KEYBOARD SUPPORT FOR EDITING

    taskList.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            event.target.classList.contains("edit-input")
        ) {
            const listItem = event.target.closest(".task-item");
            const taskId = listItem?.dataset.id;

            editingTaskId = null;
            renderTasks();

            if (taskId) {
                const editButton = taskList.querySelector(
                    `.task-item[data-id="${CSS.escape(taskId)}"] [data-action="edit"]`
                );

                editButton?.focus();
            }
        }
    });


    // 15. INITIALIZE APPLICATION

    updateFilterButtons();
    renderTasks();

});

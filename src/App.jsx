import { useMemo, useState } from "react";
import { BoardProvider, useBoard } from "./context/BoardContext";
import TaskBoard from "./components/TaskBoard";
import TaskModal from "./components/TaskModal";
import PresenceList from "./components/PresenceList";

function BoardShell() {
  const {
    state,
    userName,
    setUserName,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    setFilters,
    clearConflict,
    undo,
    redo,
    createEmptyTask,
    isOnline,
  } = useBoard();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [draft, setDraft] = useState(createEmptyTask);

  const filteredTasks = useMemo(() => {
    const query = state.filters.query.trim().toLowerCase();
    return state.tasks
      .filter((task) => {
        const titleMatch =
          !query ||
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query);
        const assigneeMatch =
          !state.filters.assignee ||
          task.assignee
            .toLowerCase()
            .includes(state.filters.assignee.toLowerCase());
        const priorityMatch =
          state.filters.priority === "all" ||
          task.priority === state.filters.priority;
        const tagMatch =
          !state.filters.tag ||
          task.tags.some((tag) =>
            tag.toLowerCase().includes(state.filters.tag.toLowerCase()),
          );
        return titleMatch && assigneeMatch && priorityMatch && tagMatch;
      })
      .sort((left, right) => {
        if (state.filters.sortBy === "priority") {
          const rank = { high: 0, medium: 1, low: 2 };
          return rank[left.priority] - rank[right.priority];
        }
        if (state.filters.sortBy === "dueDate") {
          return (
            new Date(left.dueDate || "9999-12-31") -
            new Date(right.dueDate || "9999-12-31")
          );
        }
        return (right.createdAt || 0) - (left.createdAt || 0);
      });
  }, [state.tasks, state.filters]);

  const openCreateModal = () => {
    setEditingTask(null);
    setDraft(createEmptyTask());
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setDraft({
      ...task,
      tags: [...task.tags],
      subtasks: task.subtasks.map((item) => ({ ...item })),
    });
    setIsModalOpen(true);
  };

  const handleSave = (formValues) => {
    if (editingTask) {
      updateTask(editingTask.id, formValues);
    } else {
      createTask(formValues);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (taskId) => {
    deleteTask(taskId);
    setIsModalOpen(false);
  };

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">Real-time collaborative workspace</p>
          <h1>Team task board</h1>
          <p className="subtitle">
            Create, reorder, and track work with live updates across every open
            window.
          </p>
        </div>
        <div className="hero-actions">
          <label className="user-pill">
            <span>Your name</span>
            <input
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Your name"
            />
          </label>
          <button className="primary-btn" onClick={openCreateModal}>
            + New task
          </button>
        </div>
      </header>

      <section className="toolbar-card">
        <div className="toolbar-group">
          <input
            value={state.filters.query}
            onChange={(event) => setFilters({ query: event.target.value })}
            placeholder="Search tasks"
            className="input"
          />
          <input
            value={state.filters.assignee}
            onChange={(event) => setFilters({ assignee: event.target.value })}
            placeholder="Assignee"
            className="input"
          />
          <select
            className="input"
            value={state.filters.priority}
            onChange={(event) => setFilters({ priority: event.target.value })}
          >
            <option value="all">Any priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            value={state.filters.tag}
            onChange={(event) => setFilters({ tag: event.target.value })}
            placeholder="Tag"
            className="input"
          />
          <select
            className="input"
            value={state.filters.sortBy}
            onChange={(event) => setFilters({ sortBy: event.target.value })}
          >
            <option value="createdAt">Newest first</option>
            <option value="dueDate">Due date</option>
            <option value="priority">Priority</option>
          </select>
        </div>
        <div className="toolbar-actions">
          <button className="secondary-btn" onClick={undo}>
            Undo
          </button>
          <button className="secondary-btn" onClick={redo}>
            Redo
          </button>
          <span className={`status-chip ${isOnline ? "online" : "offline"}`}>
            {isOnline ? "Live sync active" : "Offline cache"}
          </span>
        </div>
      </section>

      {state.conflictWarning ? (
        <div className="warning-banner">
          <span>{state.conflictWarning}</span>
          <button onClick={clearConflict}>Dismiss</button>
        </div>
      ) : null}

      <section className="content-grid">
        <div className="board-column">
          <TaskBoard
            tasks={filteredTasks}
            onOpenEdit={openEditModal}
            onDropTask={moveTask}
          />
        </div>
        <aside className="presence-card">
          <PresenceList presence={state.presence} />
        </aside>
      </section>

      <TaskModal
        open={isModalOpen}
        task={editingTask}
        initialValues={draft}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default function App() {
  return (
    <BoardProvider>
      <BoardShell />
    </BoardProvider>
  );
}

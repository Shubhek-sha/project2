import { useEffect, useMemo, useState } from "react";

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `task-${Math.random().toString(36).slice(2, 10)}`;
}

function parseTags(raw) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSubtasks(raw) {
  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((title) => ({ id: createId(), title, done: false }));
}

export default function TaskModal({
  open,
  task,
  initialValues,
  onClose,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(
    initialValues || {
      title: "",
      description: "",
      assignee: "",
      dueDate: "",
      priority: "medium",
      tags: [],
      subtasks: [],
      status: "backlog",
    },
  );

  useEffect(() => {
    if (initialValues) {
      setForm({
        ...initialValues,
        tags: initialValues.tags || [],
        subtasks: initialValues.subtasks || [],
      });
    }
  }, [initialValues]);

  const tagsValue = useMemo(() => (form.tags || []).join(", "), [form.tags]);
  const subtasksValue = useMemo(
    () => (form.subtasks || []).map((item) => item.title).join("\n"),
    [form.subtasks],
  );

  if (!open) {
    return null;
  }

  const submit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      assignee: form.assignee.trim(),
      tags: parseTags(form.tagsValue || tagsValue),
      subtasks: parseSubtasks(form.subtasksValue || subtasksValue),
      dueDate: form.dueDate,
      status: form.status || "backlog",
      id: form.id || createId(),
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h3>{task ? "Edit task" : "Create task"}</h3>
          <button className="small-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="full">
              <span>Title</span>
              <input
                required
                value={form.title || ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="input"
              />
            </label>
            <label className="full">
              <span>Description</span>
              <textarea
                rows="3"
                value={form.description || ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="input"
              />
            </label>
            <label>
              <span>Assignee</span>
              <input
                value={form.assignee || ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    assignee: event.target.value,
                  }))
                }
                className="input"
              />
            </label>
            <label>
              <span>Due date</span>
              <input
                type="date"
                value={form.dueDate || ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
                className="input"
              />
            </label>
            <label>
              <span>Priority</span>
              <select
                value={form.priority || "medium"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value,
                  }))
                }
                className="input"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select
                value={form.status || "backlog"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className="input"
              >
                <option value="backlog">Backlog</option>
                <option value="inProgress">In progress</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label className="full">
              <span>Tags (comma separated)</span>
              <input
                value={tagsValue}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tags: parseTags(event.target.value),
                  }))
                }
                className="input"
              />
            </label>
            <label className="full">
              <span>Subtasks (one per line)</span>
              <textarea
                rows="4"
                value={subtasksValue}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subtasks: parseSubtasks(event.target.value),
                  }))
                }
                className="input"
              />
            </label>
          </div>

          <div className="modal-actions">
            <div>
              {task ? (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => onDelete(task.id)}
                >
                  Delete
                </button>
              ) : null}
            </div>
            <div>
              <button type="submit" className="primary-btn">
                Save task
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TaskCard({ task, onOpenEdit, onDropTask }) {
  const onDrop = (event) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData("text/plain");
    if (draggedId) {
      onDropTask(draggedId, task.id, task.status);
    }
  };

  return (
    <div
      className="task-card"
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onClick={() => onOpenEdit(task)}
    >
      <div className="task-head">
        <h4>{task.title}</h4>
        <span className="badge">{task.priority}</span>
      </div>
      <div className="task-meta">
        <span>{task.assignee || "Unassigned"}</span>
        {task.dueDate ? <span>Due {task.dueDate}</span> : null}
      </div>
      <p>{task.description}</p>
      <div className="tag-list">
        {task.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>
      <div className="task-meta">
        <span>{task.subtasks.length} subtasks</span>
      </div>
    </div>
  );
}

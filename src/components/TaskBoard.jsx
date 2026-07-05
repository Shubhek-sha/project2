import TaskCard from "./TaskCard";

const columns = [
  { key: "backlog", title: "Backlog" },
  { key: "inProgress", title: "In progress" },
  { key: "done", title: "Done" },
];

export default function TaskBoard({ tasks, onOpenEdit, onDropTask }) {
  return (
    <div className="board">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.key);
        return (
          <div
            key={column.key}
            className="column"
            onDragOver={(event) => event.preventDefault()}
          >
            <h3>{column.title}</h3>
            {columnTasks.length ? (
              columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onOpenEdit={onOpenEdit}
                  onDropTask={onDropTask}
                />
              ))
            ) : (
              <div className="empty-state">Drop tasks here</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

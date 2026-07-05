export const initialState = {
  tasks: [],
  filters: {
    query: "",
    assignee: "",
    priority: "all",
    tag: "",
    sortBy: "createdAt",
  },
  history: [],
  future: [],
  revision: 0,
  presence: [],
  connectionStatus: "connecting",
  conflictWarning: "",
};

function cloneTask(task) {
  return {
    ...task,
    tags: [...(task.tags || [])],
    subtasks: (task.subtasks || []).map((subtask) => ({ ...subtask })),
  };
}

function cloneTasks(tasks) {
  return tasks.map((task) => cloneTask(task));
}

function pushSnapshot(state, nextTasks) {
  const currentTasks = cloneTasks(state.tasks);
  const updatedTasks = cloneTasks(nextTasks);
  const hasChanged =
    JSON.stringify(updatedTasks) !== JSON.stringify(currentTasks);

  if (!hasChanged) {
    return state;
  }

  return {
    ...state,
    tasks: updatedTasks,
    revision: state.revision + 1,
    history: [...state.history, currentTasks].slice(-50),
    future: [],
  };
}

export function boardReducer(state, action) {
  switch (action.type) {
    case "HYDRATE": {
      return {
        ...state,
        tasks: cloneTasks(action.payload.tasks || []),
        filters: {
          ...state.filters,
          ...action.payload.filters,
        },
        revision: action.payload.revision || 0,
        history: [],
        future: [],
      };
    }
    case "SET_FILTERS":
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
      };
    case "SET_REMOTE_STATE":
      return {
        ...state,
        tasks: cloneTasks(action.payload.tasks || []),
        revision: action.payload.revision || state.revision,
        conflictWarning: action.payload.conflictWarning || "",
      };
    case "SET_CONNECTION_STATE":
      return {
        ...state,
        connectionStatus: action.payload.connectionStatus,
        conflictWarning: action.payload.warning || state.conflictWarning,
      };
    case "SET_PRESENCE":
      return {
        ...state,
        presence: action.payload,
      };
    case "SET_CONFLICT":
      return {
        ...state,
        conflictWarning: action.payload,
      };
    case "CLEAR_WARNING":
      return {
        ...state,
        conflictWarning: "",
      };
    case "ADD_TASK": {
      return pushSnapshot(state, [...state.tasks, action.payload]);
    }
    case "UPDATE_TASK": {
      const updatedTasks = state.tasks.map((task) =>
        task.id === action.payload.taskId
          ? { ...task, ...action.payload.updates }
          : task,
      );
      return pushSnapshot(state, updatedTasks);
    }
    case "DELETE_TASK": {
      const updatedTasks = state.tasks.filter(
        (task) => task.id !== action.payload.taskId,
      );
      return pushSnapshot(state, updatedTasks);
    }
    case "MOVE_TASK": {
      const movingTask = state.tasks.find(
        (task) => task.id === action.payload.taskId,
      );
      if (!movingTask) {
        return state;
      }

      const updatedTask = {
        ...movingTask,
        status: action.payload.status || movingTask.status,
      };
      const withoutMoved = state.tasks.filter(
        (task) => task.id !== action.payload.taskId,
      );
      const targetTask = withoutMoved.find(
        (task) => task.id === action.payload.targetId,
      );

      let nextTasks;
      if (targetTask) {
        const insertIndex = withoutMoved.findIndex(
          (task) => task.id === action.payload.targetId,
        );
        nextTasks = [...withoutMoved];
        nextTasks.splice(insertIndex, 0, updatedTask);
      } else {
        nextTasks = [...withoutMoved, updatedTask];
      }

      return pushSnapshot(state, nextTasks);
    }
    case "UNDO": {
      if (!state.history.length) {
        return state;
      }

      const previousTasks = state.history[state.history.length - 1];
      return {
        ...state,
        tasks: cloneTasks(previousTasks),
        history: state.history.slice(0, -1),
        future: [cloneTasks(state.tasks), ...state.future].slice(0, 50),
        revision: state.revision + 1,
      };
    }
    case "REDO": {
      if (!state.future.length) {
        return state;
      }

      const nextTasks = state.future[0];
      return {
        ...state,
        tasks: cloneTasks(nextTasks),
        future: state.future.slice(1),
        history: [...state.history, cloneTasks(state.tasks)].slice(-50),
        revision: state.revision + 1,
      };
    }
    default:
      return state;
  }
}

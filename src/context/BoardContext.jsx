import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { boardReducer, initialState } from "../state/boardReducer";

const BoardContext = createContext(null);
const STORAGE_KEY = "collab-task-board-cache";
const USER_NAME_KEY = "collab-task-board-user";

export function normalizeUserName(nextName) {
  return (nextName ?? "").trim();
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `task-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyTask() {
  return {
    id: createId(),
    title: "",
    description: "",
    assignee: "",
    dueDate: "",
    priority: "medium",
    tags: [],
    subtasks: [],
    status: "backlog",
    createdAt: Date.now(),
  };
}

export function BoardProvider({ children }) {
  const [state, dispatch] = useReducer(boardReducer, initialState);
  const [userName, setUserNameState] = useState(() => {
    const savedName = localStorage.getItem(USER_NAME_KEY);
    return savedName === null ? "Guest" : savedName;
  });
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [userId] = useState(() => createId());
  const socketRef = useRef(null);
  const pendingSyncRef = useRef(false);
  const stateRef = useRef(state);
  const localChangeRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        dispatch({ type: "HYDRATE", payload: parsed });
      }
    } catch (error) {
      console.error("Could not restore cached board state", error);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextFilters = {
      query: params.get("query") || "",
      assignee: params.get("assignee") || "",
      priority: params.get("priority") || "all",
      tag: params.get("tag") || "",
      sortBy: params.get("sortBy") || "createdAt",
    };
    dispatch({ type: "SET_FILTERS", payload: nextFilters });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (state.filters.query) params.set("query", state.filters.query);
    if (state.filters.assignee) params.set("assignee", state.filters.assignee);
    if (state.filters.priority && state.filters.priority !== "all")
      params.set("priority", state.filters.priority);
    if (state.filters.tag) params.set("tag", state.filters.tag);
    if (state.filters.sortBy && state.filters.sortBy !== "createdAt")
      params.set("sortBy", state.filters.sortBy);
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [state.filters]);

  useEffect(() => {
    if (
      !state.tasks.length &&
      !state.filters.query &&
      !state.filters.assignee &&
      !state.filters.priority &&
      !state.filters.tag &&
      !state.filters.sortBy
    ) {
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tasks: state.tasks,
        filters: state.filters,
        revision: state.revision,
      }),
    );
  }, [state.tasks, state.filters, state.revision]);

  const sendStateSnapshot = useCallback((socket = socketRef.current) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pendingSyncRef.current = true;
      return;
    }

    socket.send(
      JSON.stringify({
        type: "state",
        payload: {
          tasks: stateRef.current.tasks,
          revision: stateRef.current.revision,
        },
      }),
    );
  }, []);

  useEffect(() => {
    if (localChangeRef.current) {
      localChangeRef.current = false;
      sendStateSnapshot();
    }
  }, [state.tasks, state.revision, sendStateSnapshot]);

  useEffect(() => {
    const socket = new WebSocket(
      import.meta.env.VITE_WS_URL || "ws://127.0.0.1:3001",
    );
    socketRef.current = socket;

    const handleOpen = () => {
      setIsOnline(true);
      dispatch({
        type: "SET_CONNECTION_STATE",
        payload: { connectionStatus: "connected", warning: "" },
      });
      socket.send(
        JSON.stringify({ type: "join", payload: { userId, userName } }),
      );
      socket.send(
        JSON.stringify({
          type: "presence",
          payload: { userId, userName, active: true },
        }),
      );
      if (pendingSyncRef.current) {
        sendStateSnapshot(socket);
        pendingSyncRef.current = false;
      }
    };

    const handleMessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "snapshot") {
        dispatch({
          type: "SET_REMOTE_STATE",
          payload: {
            ...message.data.boardState,
            conflictWarning:
              stateRef.current.revision < message.data.boardState.revision
                ? "A remote board update arrived. Your local view is now synced."
                : "",
          },
        });
      }

      if (message.type === "presence") {
        dispatch({ type: "SET_PRESENCE", payload: message.data });
      }
    };

    const handleClose = () => {
      setIsOnline(false);
      dispatch({
        type: "SET_CONNECTION_STATE",
        payload: {
          connectionStatus: "offline",
          warning: "Offline — local cache is active.",
        },
      });
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", handleClose);

    const presenceHeartbeat = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "presence",
            payload: { userId, userName, active: true },
          }),
        );
      }
    }, 5000);

    const handleOnline = () => {
      setIsOnline(true);
      dispatch({
        type: "SET_CONNECTION_STATE",
        payload: {
          connectionStatus: "connected",
          warning: "Back online — syncing board.",
        },
      });
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({ type: "join", payload: { userId, userName } }),
        );
        sendStateSnapshot(socket);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      dispatch({
        type: "SET_CONNECTION_STATE",
        payload: {
          connectionStatus: "offline",
          warning: "You are offline. Changes are cached locally.",
        },
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("close", handleClose);
      window.clearInterval(presenceHeartbeat);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      socket.close();
    };
  }, [userId, userName, sendStateSnapshot]);

  const setUserName = useCallback(
    (nextName) => {
      const normalizedName = normalizeUserName(nextName);
      localStorage.setItem(USER_NAME_KEY, normalizedName);
      setUserNameState(normalizedName);
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "presence",
            payload: {
              userId,
              userName: normalizedName || "Guest",
              active: true,
            },
          }),
        );
      }
    },
    [userId],
  );

  const createTask = useCallback((task) => {
    localChangeRef.current = true;
    dispatch({
      type: "ADD_TASK",
      payload: { ...task, id: task.id || createId(), createdAt: Date.now() },
    });
  }, []);

  const updateTask = useCallback((taskId, updates) => {
    localChangeRef.current = true;
    dispatch({ type: "UPDATE_TASK", payload: { taskId, updates } });
  }, []);

  const deleteTask = useCallback((taskId) => {
    localChangeRef.current = true;
    dispatch({ type: "DELETE_TASK", payload: { taskId } });
  }, []);

  const moveTask = useCallback((taskId, targetId, status) => {
    localChangeRef.current = true;
    dispatch({ type: "MOVE_TASK", payload: { taskId, targetId, status } });
  }, []);

  const setFilters = useCallback((nextFilters) => {
    dispatch({ type: "SET_FILTERS", payload: nextFilters });
  }, []);

  const clearConflict = useCallback(() => {
    dispatch({ type: "CLEAR_WARNING" });
  }, []);

  const undo = useCallback(() => {
    localChangeRef.current = true;
    dispatch({ type: "UNDO" });
  }, []);

  const redo = useCallback(() => {
    localChangeRef.current = true;
    dispatch({ type: "REDO" });
  }, []);

  const value = useMemo(
    () => ({
      state,
      userName,
      userId,
      isOnline,
      createTask,
      updateTask,
      deleteTask,
      moveTask,
      setFilters,
      setUserName,
      clearConflict,
      undo,
      redo,
      createEmptyTask,
    }),
    [
      state,
      userName,
      userId,
      isOnline,
      createTask,
      updateTask,
      deleteTask,
      moveTask,
      setFilters,
      setUserName,
      clearConflict,
      undo,
      redo,
    ],
  );

  return (
    <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
  );
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error("useBoard must be used inside a BoardProvider");
  }
  return context;
}

export { createEmptyTask };

import { describe, expect, it } from "vitest";
import { boardReducer, initialState } from "./boardReducer";
import { normalizeUserName } from "../context/BoardContext";
describe("boardReducer", () => {
  it("adds a task and keeps a history entry for undo", () => {
    const task = {
      id: "1",
      title: "Draft spec",
      description: "",
      assignee: "",
      dueDate: "",
      priority: "medium",
      tags: [],
      subtasks: [],
      status: "backlog",
      createdAt: 1,
    };
    const withTask = boardReducer(initialState, {
      type: "ADD_TASK",
      payload: task,
    });

    expect(withTask.tasks).toHaveLength(1);
    expect(withTask.tasks[0].title).toBe("Draft spec");
    expect(withTask.history).toHaveLength(1);

    const undone = boardReducer(withTask, { type: "UNDO" });
    expect(undone.tasks).toHaveLength(0);
  });

  it("updates filters without mutating prior state", () => {
    const updated = boardReducer(initialState, {
      type: "SET_FILTERS",
      payload: { query: "launch" },
    });
    expect(updated.filters.query).toBe("launch");
    expect(initialState.filters.query).toBe("");
  });

  it("keeps an empty user name empty instead of replacing it with Guest", () => {
    expect(normalizeUserName("   ")).toBe("");
    expect(normalizeUserName("Guest")).toBe("Guest");
  });
});

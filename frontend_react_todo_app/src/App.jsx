import React, { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "kavia.todoApp.v1";

/**
 * @typedef {"all" | "active" | "completed"} Filter
 */

/**
 * @typedef Todo
 * @property {string} id
 * @property {string} title
 * @property {boolean} completed
 * @property {number} createdAt
 */

/**
 * Safely loads persisted app state from localStorage.
 * @returns {{ todos: Todo[], filter: Filter }}
 */
function loadPersistedState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { todos: [], filter: "all" };
    const parsed = JSON.parse(raw);

    const todos = Array.isArray(parsed?.todos) ? parsed.todos : [];
    const filter =
      parsed?.filter === "all" ||
      parsed?.filter === "active" ||
      parsed?.filter === "completed"
        ? parsed.filter
        : "all";

    // Defensive normalization
    const normalizedTodos = todos
      .filter((t) => t && typeof t === "object")
      .map((t) => ({
        id: typeof t.id === "string" ? t.id : crypto.randomUUID(),
        title: typeof t.title === "string" ? t.title : "",
        completed: Boolean(t.completed),
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now()
      }))
      .filter((t) => t.title.trim().length > 0);

    return { todos: normalizedTodos, filter };
  } catch {
    return { todos: [], filter: "all" };
  }
}

/**
 * Persists app state to localStorage.
 * @param {{ todos: Todo[], filter: Filter }} state
 */
function persistState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore (private mode/quota). App continues in-memory.
  }
}

/**
 * @param {Filter} filter
 * @param {Todo[]} todos
 */
function applyFilter(filter, todos) {
  if (filter === "active") return todos.filter((t) => !t.completed);
  if (filter === "completed") return todos.filter((t) => t.completed);
  return todos;
}

// PUBLIC_INTERFACE
export default function App() {
  /** @type {[Todo[], Function]} */
  const [todos, setTodos] = useState(() => loadPersistedState().todos);
  /** @type {[Filter, Function]} */
  const [filter, setFilter] = useState(() => loadPersistedState().filter);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    persistState({ todos, filter });
  }, [todos, filter]);

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const active = total - completed;
    return { total, completed, active };
  }, [todos]);

  const filteredTodos = useMemo(() => applyFilter(filter, todos), [filter, todos]);

  function addTodoFromInput() {
    const title = newTitle.trim();
    if (!title) return;

    const todo = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: Date.now()
    };

    setTodos((prev) => [todo, ...prev]);
    setNewTitle("");
    inputRef.current?.focus();
  }

  /**
   * @param {React.FormEvent} e
   */
  function onSubmit(e) {
    e.preventDefault();
    addTodoFromInput();
  }

  /**
   * @param {string} id
   */
  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  /**
   * @param {string} id
   */
  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function clearCompleted() {
    setTodos((prev) => prev.filter((t) => !t.completed));
  }

  return (
    <div className="page">
      <div className="shell">
        <header className="header">
          <div className="brand">
            <div className="logo" aria-hidden="true">
              ✓
            </div>
            <div>
              <h1 className="title">Todo</h1>
              <p className="subtitle">
                Minimal, fast, local-first checklist.
              </p>
            </div>
          </div>

          <div className="stats" aria-label="Todo statistics">
            <div className="stat">
              <div className="statValue">{stats.total}</div>
              <div className="statLabel">Total</div>
            </div>
            <div className="stat">
              <div className="statValue">{stats.active}</div>
              <div className="statLabel">Active</div>
            </div>
            <div className="stat">
              <div className="statValue">{stats.completed}</div>
              <div className="statLabel">Done</div>
            </div>
          </div>
        </header>

        <main className="card" aria-label="Todo app">
          <form className="composer" onSubmit={onSubmit}>
            <label className="srOnly" htmlFor="newTodo">
              New todo
            </label>
            <input
              id="newTodo"
              ref={inputRef}
              className="input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a new todo…"
              autoComplete="off"
              inputMode="text"
              maxLength={160}
            />
            <button className="primaryBtn" type="submit">
              Add
            </button>
          </form>

          <section className="controls" aria-label="Filters and actions">
            <div className="filters" role="tablist" aria-label="Todo filters">
              <button
                type="button"
                role="tab"
                aria-selected={filter === "all"}
                className={filter === "all" ? "chip chipActive" : "chip"}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === "active"}
                className={filter === "active" ? "chip chipActive" : "chip"}
                onClick={() => setFilter("active")}
              >
                Active
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === "completed"}
                className={filter === "completed" ? "chip chipActive" : "chip"}
                onClick={() => setFilter("completed")}
              >
                Completed
              </button>
            </div>

            <button
              type="button"
              className="textBtn"
              onClick={clearCompleted}
              disabled={stats.completed === 0}
              title="Remove all completed todos"
            >
              Clear completed
            </button>
          </section>

          <section className="list" aria-label="Todo list">
            {filteredTodos.length === 0 ? (
              <div className="empty">
                <div className="emptyTitle">Nothing here</div>
                <div className="emptyText">
                  {filter === "all"
                    ? "Add your first todo above."
                    : "Try switching filters."}
                </div>
              </div>
            ) : (
              <ul className="ul" aria-label="Todos">
                {filteredTodos.map((todo) => (
                  <li key={todo.id} className="row">
                    <button
                      type="button"
                      className={todo.completed ? "check checked" : "check"}
                      aria-pressed={todo.completed}
                      onClick={() => toggleTodo(todo.id)}
                      title={todo.completed ? "Mark as active" : "Mark as done"}
                    >
                      <span className="srOnly">
                        {todo.completed ? "Completed" : "Active"}
                      </span>
                      <span aria-hidden="true">{todo.completed ? "✓" : ""}</span>
                    </button>

                    <div className="rowBody">
                      <div className={todo.completed ? "todo done" : "todo"}>
                        {todo.title}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="dangerBtn"
                      onClick={() => deleteTodo(todo.id)}
                      title="Delete todo"
                      aria-label={`Delete "${todo.title}"`}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>

        <footer className="footer">
          <div className="footerText">
            Stored locally in your browser (localStorage).
          </div>
        </footer>
      </div>
    </div>
  );
}

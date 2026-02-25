"use client";

import { useState } from "react";
import { useEffect } from "react";

const BACKEND_URL = "http://backend:4000";

export default function AdminClient({ notes, initialAdminStats }) {
  const [input, setInput] = useState("");
  const [adminStats, setAdminStats] = useState(initialAdminStats);
  const [adminStatsTime, setAdminStatsTime] = useState(Date.now());

  useEffect(() => {
    setInterval(() => {
      fetch(BACKEND_URL + "/stats")
        .then((res) => res.json())
        .then((data) => {
          setAdminStats(data)
          setAdminStatsTime(Date.now())
        })
        .catch((err) => console.error("Error fetching stats:", err));
    }, 10000);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    fetch(BACKEND_URL + "/notes", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: trimmed,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to save note");
        }
        location.reload()
        return res.json();
      })
      .catch((err) => {
        console.error("Error saving note:", err);
        alert("Failed to save note.");
      });
  };

  const handleClear = (id) => {
    fetch(BACKEND_URL + "/notes", {
      method: "DELETE",
      headers: {
        "Content-Type": "text/plain",
      },
      body: id,
    })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to save note");
      }
      location.reload()
      return res.json();
    })
    .catch((err) => {
      console.error("Error deleting note:", err);
      alert("Failed to deleting note.");
    });
  };

  const handleClearAll = () => {
    if (!confirm("Clear all notes?")) return;
    handleClear("*")
  };

  return (
    <main className="w-full mx-auto max-w-2xl min-h-screen p-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Safe Notes App
        </h1>
        <p className="text-sm">Welcome ADMIN to easy note-taking!</p>

        <div>
          <p className="text-sm">Admin Stats:</p>
          <ul className="list-disc pl-4">
            <li>Notes: {adminStats?.totalNotes || 0}</li>
            <li>Chars: {adminStats?.totalChars || 0}</li>
            <li>Users: {adminStats?.totalUsers || 0}</li>
            <li>Last Updated: {new Date(adminStatsTime).toLocaleString()}</li>
          </ul>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-4 space-y-3 rounded-2xl border border-slate-500 p-4 backdrop-blur"
      >
        <label className="block text-sm font-medium text-slate-700 mb-1">
          New note
        </label>
        <textarea
          className="w-full rounded-xl border bg-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-y min-h-20"
          placeholder="Type something mildly incriminating..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={!input.trim()}
          >
            Save note
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>
              {notes.length} note{notes.length !== 1 && "s"}
            </span>
            {notes.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="underline-offset-2 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </form>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Saved notes</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-slate-600">
            No notes yet. Your future bug chain victims will thank you.
          </p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="group rounded-2xl border border-slate-500 bg-slate-200 p-3 text-sm flex justify-between gap-3"
              >
                <div className="space-y-1">
                  <p className="whitespace-pre-wrap wrap-break-word">
                    {note.text}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleClear(note.id)}
                  className="shrink-0 self-start text-xs text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition"
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

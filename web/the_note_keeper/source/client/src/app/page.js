"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "notes";

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Load notes from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setNotes(parsed);
      }
    } catch (err) {
      console.error("Failed to parse notes from localStorage", err);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    if (!loaded) return; // avoid saving initial empty state over existing data
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (err) {
      console.error("Failed to save notes to localStorage", err);
    }
  }, [notes, loaded]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const newNote = {
      id: crypto.randomUUID(),
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setNotes((prev) => [newNote, ...prev]);
    setInput("");
  };

  const handleClear = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    if (!confirm("Clear all notes?")) return;
    setNotes([]);
  };

  return (
    <main className="w-full mx-auto max-w-2xl min-h-screen p-4">
      <header className="flex justify-between gap-x-4 space-y-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Safe Notes App
          </h1>
          <p className="text-sm">
            Hello guest, welcome to easy note-taking! Manage your notes here with ease.
          </p>
        </div>
        <Link href="/login?state=L2FkbWlu" className="underline">
          Login
        </Link>
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
          placeholder="What's on your mind?..."
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
            <span>{notes.length} note{notes.length !== 1 && "s"}</span>
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
            No notes yet.
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

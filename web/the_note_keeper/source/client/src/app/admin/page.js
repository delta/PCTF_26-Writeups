"use server"
import { cookies } from "next/headers";
import AdminClient from "./client";

const BACKEND_URL = "http://backend:4000";

export default async function NotesPage() {
  const _ = await cookies(); // need to import cookies to prevent SSG

  const notesRes = await fetch(BACKEND_URL+"/notes", {
    next: {
      tags: ["admin-notes"]
    }
  });

  const adminStatsRes = await fetch(BACKEND_URL+"/stats");
  const adminStats = await adminStatsRes.json();

  const notes = await notesRes.json();

  return <AdminClient notes={notes} initialAdminStats={adminStats} />
}

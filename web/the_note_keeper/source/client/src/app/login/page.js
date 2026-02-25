"use client";

export default function AdminLogin() {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get("username")?.trim();
    const password = formData.get("password")?.trim();

    fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password
      })
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to login");
        }
        alert("Login successful!");
        window.location.href = "/admin";
      })
      .catch((err) => {
        alert("Login failed. Please check your credentials and try again.");
      })
  };

  return (
    <main className="w-full mx-auto max-w-2xl min-h-screen p-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Admin Login
        </h1>
        <p className="text-sm">
          Please login to continue
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-4 space-y-3 rounded-2xl border border-slate-500 p-4 backdrop-blur"
      >
        <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
          username
        </label>
        <input
          name="username"
          type="text"
          className="w-full rounded-xl border bg-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          placeholder="Enter your username"
          required
        />

        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          password
        </label>
        <input
          name="password"
          type="text"
          className="w-full rounded-xl border bg-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          placeholder="Enter your password"
          required
        />

        <button
          type="submit"
          className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Login
        </button>
      </form>
    </main>
  );
}

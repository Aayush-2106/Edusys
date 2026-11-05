"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Search box for the admin student table. Submits as a URL query. */
export function StudentSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed ? `/admin?q=${encodeURIComponent(trimmed)}` : "/admin");
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search name, email, branch"
        aria-label="Search students"
        className="input w-56"
      />
      <button type="submit" className="btn btn-secondary">
        Search
      </button>
      {initial && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            router.push("/admin");
          }}
          className="btn btn-secondary"
        >
          Clear
        </button>
      )}
    </form>
  );
}

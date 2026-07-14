"use client";

import { useState } from "react";

type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export function NotificationList({
  initialItems,
}: {
  initialItems: Notification[];
}) {
  const [items, setItems] = useState(initialItems);
  async function markRead(id: string) {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }
  return (
    <div className="grid gap-3">
      {items.length === 0 ? (
        <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">
          You have no notifications yet.
        </div>
      ) : (
        items.map((item) => (
          <article
            className={`rounded-md border bg-card p-4 shadow-sm ${item.read ? "" : "border-primary/40 bg-primary/5"}`}
            key={item.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.body}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString("en-PH")}
                </p>
              </div>
              {item.read ? null : (
                <button
                  className="min-h-11 rounded-md border px-3 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void markRead(item.id)}
                >
                  Mark read
                </button>
              )}
            </div>
          </article>
        ))
      )}
    </div>
  );
}

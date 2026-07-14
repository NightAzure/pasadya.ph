import { getAdminActor, listAdminUsers } from "@/modules/admin";

import { AdminHeader, AdminNav } from "../_components";

export default async function AdminUsersPage() {
  await getAdminActor("admin");
  const users = await listAdminUsers();
  return (
    <main
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      id="main-content"
    >
      <AdminHeader
        title="User operations"
        description="Review account roles and recent users. Role changes and account deletion remain restricted to a later controlled workflow."
      />
      <AdminNav active="users" />
      <section className="grid gap-3">
        {users.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            No users found.
          </div>
        ) : (
          users.map((user) => (
            <article
              className="rounded-lg border bg-card p-4 shadow-sm"
              key={user.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">
                    {user.name ?? "Unnamed user"}
                  </h2>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {user.email ?? "No email"}
                  </p>
                </div>
                <span className="rounded-md border px-2 py-1 text-xs font-semibold">
                  {user.role}
                </span>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

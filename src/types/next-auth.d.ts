import { DefaultSession } from "next-auth";

import { userRoleEnum } from "@/db/schema";

type UserRole = (typeof userRoleEnum.enumValues)[number];

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
  }
}

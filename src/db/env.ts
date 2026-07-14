import "dotenv/config";

export const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://project_z:project_z@localhost:5432/project_z";

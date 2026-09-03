/**
 * Seed the linked Supabase project via Management API SQL
 * (no DATABASE_URL / DB password required).
 *
 * Usage:
 *   npx tsx scripts/seed-supabase-linked.ts
 */
import { spawnSync } from "node:child_process";

import pg from "pg";

const PROJECT_REF = "kgmdwsfzsqghqzeepcjr";

function readCliAccessToken() {
  const ps = `
$sig = @'
[DllImport("advapi32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);
[DllImport("advapi32.dll", SetLastError=true)]
public static extern bool CredFree(IntPtr cred);
[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
public struct CREDENTIAL {
  public int Flags; public int Type; public IntPtr TargetName; public IntPtr Comment;
  public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
  public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
  public int AttributeCount; public IntPtr Attributes; public IntPtr TargetAlias; public IntPtr UserName;
}
'@
Add-Type -MemberDefinition $sig -Namespace Advapi32 -Name SeedCred -ErrorAction SilentlyContinue
$ptr = [IntPtr]::Zero
if (-not [Advapi32.SeedCred]::CredRead("Supabase CLI:supabase", 1, 0, [ref]$ptr)) { exit 1 }
$cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][Advapi32.SeedCred+CREDENTIAL])
$bytes = New-Object byte[] $cred.CredentialBlobSize
[System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
[Advapi32.SeedCred]::CredFree($ptr) | Out-Null
[Text.Encoding]::UTF8.GetString($bytes).Trim()
`;
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-Command", ps],
    { encoding: "utf8" },
  );
  const token = (result.stdout || "").trim();
  if (!token.startsWith("sbp_")) {
    throw new Error(
      "Could not read Supabase CLI access token. Run `npx supabase login` first.",
    );
  }
  return token;
}

function quoteLiteral(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Buffer.isBuffer(value)) return `'\\x${value.toString("hex")}'`;
  if (Array.isArray(value)) {
    return `array[${value.map((item) => quoteLiteral(item)).join(", ")}]`;
  }
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function interpolate(sqlText: string, params: unknown[] = []) {
  return sqlText.replace(/\$(\d+)/g, (_, index) => {
    const value = params[Number(index) - 1];
    return quoteLiteral(value);
  });
}

function installManagementPool(token: string) {
  async function runQuery(
    config: string | { text: string; values?: unknown[] },
    values?: unknown[],
  ) {
    const text = typeof config === "string" ? config : config.text;
    const params =
      values ?? (typeof config === "object" ? config.values : []) ?? [];
    const sqlText = `set search_path to public, extensions;\n${interpolate(text, params)}`;

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sqlText }),
      },
    );

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Supabase SQL API ${response.status}: ${body}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body;
    }

    const rows = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { rows?: unknown[] })?.rows)
        ? ((parsed as { rows: unknown[] }).rows)
        : parsed &&
            typeof parsed === "object" &&
            !("boundary" in (parsed as object))
          ? [parsed]
          : [];

    return {
      rows,
      rowCount: rows.length,
      command: "SELECT",
      oid: 0,
      fields: [],
    };
  }

  class ManagementClient {
    query = runQuery;
    release() {}
  }

  class ManagementPool {
    query = runQuery;
    async connect() {
      return new ManagementClient();
    }
    on() {
      return this;
    }
    async end() {}
  }

  (pg as unknown as { Pool: unknown }).Pool = ManagementPool;
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN || readCliAccessToken();
  installManagementPool(token);

  // Avoid accidental local TCP connect if anything still reads env.
  process.env.DATABASE_URL =
    "postgresql://unused:unused@127.0.0.1:1/unused";

  console.log(`Seeding linked Supabase project ${PROJECT_REF} via SQL API...`);
  await import("../src/db/seed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

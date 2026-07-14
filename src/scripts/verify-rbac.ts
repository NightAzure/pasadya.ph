import { verifyUnauthenticatedDenied } from "@/lib/rbac.test";

verifyUnauthenticatedDenied()
  .then(() => {
    console.log("RBAC unauthenticated denial passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

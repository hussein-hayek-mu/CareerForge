import nextEnv from "@next/env";
import { deploymentConfigErrors } from "./deployment-config.mjs";

nextEnv.loadEnvConfig(process.cwd(), false);
const errors = deploymentConfigErrors(process.env);
if (errors.length) {
  console.error("Deployment configuration needs attention:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("PASS: deployment configuration shape checked without network calls or secret output.");
  console.log("Credentials, callback allowlists, migrations, backups and hosted flows still require verification.");
}

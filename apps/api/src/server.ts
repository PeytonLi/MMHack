import { createApiApp } from "./app";
import { getApiEnv } from "./env";

const env = getApiEnv();
const app = createApiApp();

app.listen(env.API_PORT, () => {
  console.log(`MMHack API listening on port ${env.API_PORT}`);
});

import { createApplicationServer } from "../src/application/server";
import { ApplicationService } from "../src/application/service";

const secret = process.env.BETTER_AUTH_SECRET ?? "better-auth-test-secret";
const server = createApplicationServer({
  env: process.env,
  service: new ApplicationService({ sessionSecret: secret }),
});

server.listen(Number(process.env.PORT ?? 4371), "0.0.0.0");

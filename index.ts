import { Application, Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { CorsOptions, oakCors } from "https://deno.land/x/cors/mod.ts";
import router from "./routes.ts";

const port = parseInt(Deno.env.get("PORT") ?? "8181");
const app = new Application();

const corsConfig: CorsOptions = {
  origin: "*",
  methods: ["GET", "PUT", "POST"],
  allowedHeaders: "*",
  preflightContinue: true,
  optionsSuccessStatus: 204,
};

app.use(oakCors(corsConfig));
app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", () => {
  console.log(`Listening on localhost:${port}`);
});

await app.listen({ port });

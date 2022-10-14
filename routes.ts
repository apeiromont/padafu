import { Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { apiRenderPdf } from "./controller.ts";

export default new Router()
  .post("/v0/render", apiRenderPdf);

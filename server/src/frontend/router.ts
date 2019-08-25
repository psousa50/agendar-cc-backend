import { Config } from "convict"
import express from "express"
import { renderApp } from "./renderApp";
import { AppConfig } from "../../../shared/config";

export function buildFrontendRouter(config: Config<AppConfig>): express.Router {
  const router = express.Router()

  router.get("*", (req, res) => {
    renderApp(req, res, config)
  })

  return router
}

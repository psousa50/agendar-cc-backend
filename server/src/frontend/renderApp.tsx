import { Config } from "convict"
import { Request, Response } from "express"
import React from "react"
import { renderToString } from "react-dom/server"
import { AppConfig } from "../../../shared/config"
import { compileAssets } from "./compile-assets"
import { Document } from "./Document"

export function renderApp(req: Request, res: Response, config: Config<AppConfig>) {
  const clientConfig: AppConfig = {
    crawlDaysLimit: config.get("crawlDaysLimit"),
    fetchDelay: config.get("fetchDelay"),
    irnUrl: config.get("irnUrl"),
    nodeEnv: config.get("nodeEnv"),
    port: config.get("port"),
  }

  res.send("<!DOCTYPE HTML>\n" + renderToString(
    <Document
      assets={compileAssets(config)}
      clientConfig={clientConfig}
      csrfToken={req.csrfToken ? req.csrfToken() : ""}
    />,
  ))
}

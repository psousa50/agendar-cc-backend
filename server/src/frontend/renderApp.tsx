import { Config } from "convict"
import { Request, Response } from "express"
import React from "react"
import { renderToString } from "react-dom/server"
import { compileAssets } from "./compile-assets"
import { Document } from "./Document"
import { AppConfig } from "../../../shared/config";

export function renderApp(req: Request, res: Response, config: Config<AppConfig>) {
  const clientConfig: AppConfig = {
    irnUrl: config.get("irnUrl"),
    nodeEnv: config.get("nodeEnv"),
    port: config.get("port")
  }

  res.send("<!DOCTYPE HTML>\n" + renderToString(
    <Document
      assets={compileAssets(config)}
      clientConfig={clientConfig}
      csrfToken={req.csrfToken ? req.csrfToken() : ""}
    />,
  ))
}

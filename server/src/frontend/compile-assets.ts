import { Config } from "convict"
import fs from "fs"
import path from "path"
import { AppConfig } from "../../../shared/config"

export interface IAssets {
  [key: string]: {
    js?: string
    css?: string
  }
}

export function compileAssets(config: Config<AppConfig>): IAssets {
  if (config.get("nodeEnv") !== "production") {
    return {
      _vendor: {
        js: "/static/_vendor.js",
      },
      main: {
        js: "/static/main.js",
      },
    }
  }

  // Fetch Webpack build manifest for hashed chunk names:
  const webpackAssets = path.resolve(__dirname!, "..", "..", "..", "webpack-assets.json")
  return JSON.parse(fs.readFileSync(webpackAssets, "utf-8"))
}

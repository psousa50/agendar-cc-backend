import convict from "convict"

export interface AppConfig {
  crawlDaysLimit: number
  irnUrl: string
  nodeEnv: string
  port: number
}

export const config = convict<AppConfig>({
  crawlDaysLimit: {
    default: 30,
    doc: "",
    env: "",
    format: "number",
  },
  irnUrl: {
    default: "http://localhost:20001",
    doc: "IRN URL.",
    env: "IRN_URL",
    format: "url",
  },
  nodeEnv: {
    default: "development",
    doc: "Running in an environment, or on a developer machine? Mainly used to decide log structure etc",
    env: "NODE_ENV",
    format: ["production", "development", "test"],
  },
  port: {
    default: 3000,
    doc: "",
    env: "",
    format: "port",
  },
})

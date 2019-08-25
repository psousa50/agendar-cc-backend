import convict from "convict"

export interface AppConfig {
  irnUrl: string,
  nodeEnv: string
  port: number,
}

export const config = convict<AppConfig>({
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

import convict from "convict"

export interface AppConfig {
  crawlDaysLimit: number
  fetchDelay: number
  irnUrlLocations: { homePage: string; irnUrl: string; countiesPage: string; tablesPage: string }
  nodeEnv: string
  port: number
}

export const config = convict<AppConfig>({
  crawlDaysLimit: {
    default: 30,
    doc: "",
    env: "",
    format: "int",
  },
  fetchDelay: {
    default: 500,
    doc: "",
    env: "",
    format: "int",
  },
  irnUrlLocations: {
    countiesPage: {
      default: "get_concelhos.php",
      doc: "",
      env: "COUNTIES_URL",
      format: "url",
    },
    homePage: {
      default: "step1",
      doc: "",
      env: "HOME_URL",
      format: "url",
    },
    irnUrl: {
      default: "https://agendamento.irn.mj.pt/steps/",
      doc: "",
      env: "IRN_URL",
      format: "url",
    },
    tablesPage: {
      default: "step2",
      doc: "",
      env: "TABLES_URL",
      format: "url",
    },
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

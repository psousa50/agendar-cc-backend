import convict from "convict"

export enum LogLevel {
  debug = 0,
  info = 1,
  error = 2,
}

export const logLevelDescriptions = (level: LogLevel) => ["Debug", "Info", "Error"][level]

export interface AppConfig {
  crawlDaysLimit: number
  fetchDelay: number
  geoCoding: {
    url: string
    key: string
  }
  irnUrlLocations: { homePage: string; irnUrl: string; countiesPage: string; irnTablesPage: string }
  logLevel: LogLevel
  maxNoServiceFetchDelay: number
  maxNoServiceFetchRetries: number
  mongodb: {
    uri: string
  }
  nodeEnv: string
  port: number
  retryCount: number
  retryDelay: number
}

export const config = convict<AppConfig>({
  crawlDaysLimit: {
    default: 5,
    doc: "",
    env: "CRAWL_DAYS_LIMIT",
    format: "int",
  },
  fetchDelay: {
    default: 10,
    doc: "",
    env: "FETCH_DELAY",
    format: "int",
  },
  geoCoding: {
    key: {
      default: "",
      doc: "",
      env: "GEO_CODING_KEY",
      format: "url",
    },
    url: {
      default: "https://maps.googleapis.com/maps/api/geocode/json",
      doc: "",
      env: "GEO_CODING_URL",
      format: "url",
    },
  },
  irnUrlLocations: {
    countiesPage: {
      default: "get_concelhos.php",
      doc: "",
      env: "COUNTIES_URL",
      format: "url",
    },
    homePage: {
      default: "step1.php",
      doc: "",
      env: "HOME_URL",
      format: "url",
    },
    irnTablesPage: {
      default: "step2.php",
      doc: "",
      env: "IRNTABLES_URL",
      format: "url",
    },
    irnUrl: {
      default: "https://agendamento.irn.mj.pt/steps",
      doc: "",
      env: "IRN_URL",
      format: "url",
    },
  },
  logLevel: {
    default: LogLevel.error,
    doc: "",
    env: "LOG_LEVEL",
    format: "int",
  },
  maxNoServiceFetchDelay: {
    default: 5000,
    doc: "",
    env: "MAX_NO_SERVICE_FETCH_DELAY",
    format: "int",
  },
  maxNoServiceFetchRetries: {
    default: 3,
    doc: "",
    env: "MAX_NO_SERVICE_FETCH_RETRIES",
    format: "int",
  },
  mongodb: {
    uri: {
      default: "mongodb://localhost:27017/agendar-cc",
      doc: "",
      env: "MONGODB_URI",
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
    env: "PORT",
    format: "port",
  },
  retryCount: {
    default: 3,
    doc: "",
    env: "RETRY_COUNT",
    format: "int",
  },
  retryDelay: {
    default: 5000,
    doc: "",
    env: "RETRY_DELAY",
    format: "int",
  },
})

export const isDev = (c: AppConfig) => c.nodeEnv === "development"

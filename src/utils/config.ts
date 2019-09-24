import convict from "convict"

export interface AppConfig {
  crawlDaysLimit: number
  fetchDelay: number
  geoCoding: {
    url: string
    key: string
  }
  infra: {
    useMemoryRepository: boolean
    useLocalIrnTables: boolean
  }
  irnUrlLocations: { homePage: string; irnUrl: string; countiesPage: string; irnTablesPage: string }
  mongodb: {
    uri: string
  }
  nodeEnv: string
  port: number
}

export const config = convict<AppConfig>({
  crawlDaysLimit: {
    default: 10,
    doc: "",
    env: "CRAWL_DAYS_LIMIT",
    format: "int",
  },
  fetchDelay: {
    default: 500,
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
  infra: {
    useLocalIrnTables: {
      default: false,
      doc: "",
      env: "USE_LOCAL_IRN_TABLES",
      format: "Boolean",
    },
    useMemoryRepository: {
      default: false,
      doc: "",
      env: "USE_MEMORY_REPOSITORY",
      format: "Boolean",
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
})

export const isDev = (c: AppConfig) => c.nodeEnv === "development"

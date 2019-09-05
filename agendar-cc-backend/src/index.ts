import { run } from "fp-ts/lib/ReaderTaskEither"
import { Environment } from "./app/environment"
import { expressApp } from "./app/main"
import { irnCrawler } from "./irnCrawler/main"
import { irnFetch } from "./irnFetch/main"
import { irnRepository } from "./irnRepository/main"
import { irnFetchLocal } from "./local/irnFetch"
import { config as appConfig } from "./utils/config"
import { fetchAction } from "./utils/fetch"

const buildEnvironment: () => Environment = () => {
  const config = appConfig.get()
  return {
    config,
    fetch: fetchAction,
    irnFetch: config.nodeEnv === "development" ? irnFetchLocal : irnFetch,
    irnRepository,
  }
}

const initApplication = async () => {
  const environment = buildEnvironment()

  run(irnCrawler.start(), environment)

  console.log("Config =====>\n", environment.config)

  await run(expressApp(), environment)
}

initApplication()

import { run } from "fp-ts/lib/ReaderTaskEither"
import { Environment } from "./app/environment"
import { expressApp } from "./app/main"
import { irnCrawler } from "./irnCrawler/main"
import { irnFetch } from "./irnFetch/main"
import { irnRepository } from "./irnRepository/main"
import { irnFetchLocal } from "./local/irnFetch"
import { globalIrnTables } from "./staticData/irnTables"
import { config as appConfig, isDev } from "./utils/config"
import { debug } from "./utils/debug"
import { fetchAction } from "./utils/fetch"

const buildEnvironment: () => Environment = () => {
  const config = appConfig.get()
  return {
    config,
    fetch: fetchAction,
    irnFetch: isDev(config) ? irnFetchLocal : irnFetch,
    irnRepository,
  }
}

export const startApplication = async () => {
  const environment = buildEnvironment()

  debug("Config =====>\n", environment.config)

  await run(irnCrawler.start(), environment)

  if (isDev(environment.config)) {
    environment.irnRepository.addIrnTables(globalIrnTables)
  } else {
    await run(irnCrawler.refreshTables({ startDate: new Date(Date.now()) }), environment)
  }

  await run(expressApp(), environment)
}

// startApplication()

console.log("port =====>\n", process.env.port)
console.log("PORT =====>\n", process.env.PORT)

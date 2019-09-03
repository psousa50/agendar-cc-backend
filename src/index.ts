import { run } from "fp-ts/lib/ReaderTaskEither"
import { Environment } from "./app/environment"
import { expressApp } from "./app/main"
import { irnFetch } from "./irnFetch/main"
import { irnFetchLocal } from "./local/irnFetch"
import { config as appConfig } from "./utils/config"
import { fetchAction } from "./utils/fetch"

const buildEnvironment: () => Environment = () => {
  const config = appConfig.get()
  return {
  config,
  fetch: fetchAction,
  irnFetch: config.nodeEnv === "development" ?  irnFetchLocal : irnFetch,
  irnRepository: {} as any,
}}

const initApplication = async () => {
  const environment = buildEnvironment()

  console.log("Config =====>\n", environment.config)

  await run(expressApp(), environment)
}

initApplication()

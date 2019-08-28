import { run } from "fp-ts/lib/ReaderTaskEither"
import { config as appConfig } from "../../shared/config"
import { Environment } from "./app/environment"
import { expressApp } from "./app/main"

const initApplication = async () => {

  const environment: Environment = {
    config: appConfig.get(),
    irnFetch: {} as any,
    irnRepository: {} as any,
  }

  console.log("Environment =====>\n", environment)

  await run(expressApp(), environment)
}

initApplication()

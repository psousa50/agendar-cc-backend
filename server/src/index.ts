import { expressApp } from "./main";
import { run } from "fp-ts/lib/ReaderTaskEither"
import { config as appConfig } from "../../shared/config"
import { Environment } from "../../shared/models";

const init = async () => {

  const environment: Environment = {
    config: appConfig.get()
  }

  console.log("Environment =====>\n", environment)
  await run( expressApp(), environment)
}

init()

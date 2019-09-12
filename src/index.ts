import { run } from "fp-ts/lib/ReaderTaskEither"
import { expressApp } from "./app/main"
import { buildEnvironment } from "./environment"
import { debug } from "./utils/debug"

const startApplication = async () => {
  const environment = buildEnvironment()

  debug("App Config =====>\n", environment.config)

  await run(expressApp(), environment)
}

startApplication()

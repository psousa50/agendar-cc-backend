import * as dotenv from "dotenv"
import { pipe } from "fp-ts/lib/function"
import { run } from "fp-ts/lib/ReaderTaskEither"
import { task } from "fp-ts/lib/Task"
import { fold } from "fp-ts/lib/TaskEither"
import { expressApp } from "./app/main"
import { buildEnvironment } from "./environment"
import { ServiceError } from "./utils/audit"
import { isDev } from "./utils/config"
import { logDebug } from "./utils/debug"

dotenv.config()

const exitProcess = (error: ServiceError) => {
  logDebug("Shutting down app", error.message)
  process.exit(1)
}

const startApplication = async () => {
  const process = pipe(
    buildEnvironment(),
    fold(
      e => task.of(exitProcess(e)),
      environment => {
        if (isDev(environment.config)) {
          logDebug("App Config =====>\n", environment.config)
        }

        run(expressApp(), environment)

        return task.of(undefined)
      },
    ),
  )

  await process()
}

startApplication().then(() => logDebug("App Started"), e => logDebug(`Error: ${e.message}`))

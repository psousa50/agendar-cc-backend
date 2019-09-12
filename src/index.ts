import { pipe } from "fp-ts/lib/pipeable"
import { run } from "fp-ts/lib/ReaderTaskEither"
import { task } from "fp-ts/lib/Task"
import { fold } from "fp-ts/lib/TaskEither"
import { expressApp } from "./app/main"
import { buildEnvironment } from "./environment"
import { ServiceError } from "./utils/audit"
import { logDebug } from "./utils/debug"
import { startWorker } from "./worker/main"

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
        logDebug("App Config =====>\n", environment.config)

        if (environment.config.infra.useMemoryRepository) {
          logDebug("Starting worker locally...")
          startWorker()
        }

        run(expressApp(), environment)

        return task.of(undefined)
      },
    ),
  )

  await process()
}

startApplication()

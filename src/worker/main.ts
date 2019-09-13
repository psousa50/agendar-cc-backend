import { debug } from "console"
import { pipe } from "fp-ts/lib/pipeable"
import { run } from "fp-ts/lib/ReaderTaskEither"
import { task } from "fp-ts/lib/Task"
import { fold } from "fp-ts/lib/TaskEither"
import { buildEnvironment } from "../environment"
import { irnCrawler } from "../irnCrawler/main"
import { globalIrnTables } from "../staticData/irnTables"
import { ServiceError } from "../utils/audit"
import { safeConfig } from "../utils/config"

const exitProcess = (error: ServiceError) => {
  debug("Shutting down Worker", error.message)
  process.exit(1)
}

export const startWorker = async () => {
  const process = pipe(
    buildEnvironment(),
    fold(
      e => task.of(exitProcess(e)),
      environment => {
        debug("Worker Config =====>\n", safeConfig(environment.config))
        run(irnCrawler.start(), environment)
        if (environment.config.infra.useLocalIrnTables) {
          run(environment.irnRepository.addIrnTables(globalIrnTables), environment)
        } else {
          run(irnCrawler.refreshTables({ startDate: new Date(Date.now()) }), environment)
        }
        return task.of(undefined)
      },
    ),
  )

  await process()
}

import { pipe } from "fp-ts/lib/pipeable"
import { chain, mapLeft, run } from "fp-ts/lib/ReaderTaskEither"
import { task } from "fp-ts/lib/Task"
import { fold } from "fp-ts/lib/TaskEither"
import { buildEnvironment, Environment } from "../environment"
import { irnCrawler } from "../irnCrawler/main"
import { ServiceError } from "../utils/audit"
import { isDev } from "../utils/config"
import { currentUtcDate, currentUtcDateTime } from "../utils/dates"
import { logDebug } from "../utils/debug"

const exitProcess = (error: ServiceError) => {
  logDebug("Shutting down Worker", error.message)
  process.exit(1)
  return task.of(undefined)
}

const start = (environment: Environment) => {
  if (isDev(environment.config)) {
    logDebug("App Config =====>\n", environment.config)
  }
  run(
    pipe(
      irnCrawler.start(),
      chain(() => environment.irnRepository.updateConfig({ refreshStarted: currentUtcDateTime() })),
      chain(() => irnCrawler.refreshTables({ startDate: currentUtcDate() })),
      chain(() => environment.irnRepository.updateConfig({ refreshEnded: currentUtcDateTime() })),
      chain(() => irnCrawler.updateIrnPlacesLocation()),
      chain(() => environment.irnRepository.close()),
      mapLeft(e => logDebug("ERROR: ", e)),
    ),
    environment,
  )
  return task.of(undefined)
}

export const startWorker = async () => {
  const process = pipe(
    buildEnvironment(),
    fold(exitProcess, start),
  )

  await process()
}

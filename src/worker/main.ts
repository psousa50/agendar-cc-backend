import { pipe } from "fp-ts/lib/pipeable"
import { chain, mapLeft, run } from "fp-ts/lib/ReaderTaskEither"
import { task } from "fp-ts/lib/Task"
import { fold } from "fp-ts/lib/TaskEither"
import { buildEnvironment, Environment } from "../environment"
import { irnCrawler } from "../irnCrawler/main"
import { globalIrnTables } from "../staticData/irnTables"
import { ServiceError } from "../utils/audit"
import { safeConfig } from "../utils/config"
import { logDebug } from "../utils/debug"

const exitProcess = (error: ServiceError) => {
  logDebug("Shutting down Worker", error.message)
  process.exit(1)
  return task.of(undefined)
}

const addLocalIrntables = (environment: Environment) => environment.irnRepository.addIrnTables(globalIrnTables)

const refreshTables = (environment: Environment) =>
  pipe(
    irnCrawler.refreshTables({ startDate: new Date(Date.now()) }),
    chain(() => environment.irnRepository.switchIrnTables()),
  )

const start = (environment: Environment) => {
  logDebug("Worker Config =====>\n", safeConfig(environment.config))
  run(
    pipe(
      irnCrawler.start(),
      chain(() => environment.irnRepository.updateConfig({ refreshStarted: new Date(Date.now()) })),
      chain(() =>
        environment.config.infra.useLocalIrnTables ? addLocalIrntables(environment) : refreshTables(environment),
      ),
      chain(() => environment.irnRepository.updateConfig({ refreshEnded: new Date(Date.now()) })),
      chain(() => environment.irnRepository.end()),
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

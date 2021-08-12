import { pipe } from "fp-ts/lib/pipeable"
import { chain, mapLeft, run } from "fp-ts/lib/ReaderTaskEither"
import { task } from "fp-ts/lib/Task"
import { fold } from "fp-ts/lib/TaskEither"
import moment = require("moment")
import { buildEnvironment, Environment } from "../environment"
import { irnCrawler } from "../irnCrawler/main"
import { IrnLog } from "../mongodb/main"
import { Action, actionOf, ask } from "../utils/actions"
import { ServiceError } from "../utils/audit"
import { isDev } from "../utils/config"
import { currentUtcDateString, currentUtcDateTime } from "../utils/dates"
import { logDebug } from "../utils/debug"

const exitProcess = (error: ServiceError) => {
  logDebug("Shutting down Worker", error.message)
  process.exit(1)
  return task.of(undefined)
}

const checkIsTimeToRun: Action<IrnLog | undefined, boolean> = lastRefreshIrnLog => {
  const lastTimestamp = lastRefreshIrnLog && lastRefreshIrnLog.timestamp
  const minElappsedTimeMn = lastRefreshIrnLog ? (lastRefreshIrnLog.type === "RefreshStarted" ? 15 : 1) : undefined
  const now = currentUtcDateTime()
  const needsToRun =
    lastTimestamp && minElappsedTimeMn ? now.diff(moment.utc(lastTimestamp), "minute") > minElappsedTimeMn : true
  logDebug(needsToRun ? "Running Refresh Tables..." : "Skipping Refresh Tables!")
  return actionOf(needsToRun)
}

const runProcess: Action<void, void> = () =>
  pipe(
    ask(),
    chain(env =>
      pipe(
        irnCrawler.start(),
        chain(() => env.irnRepository.removeOldLogs()),
        chain(() => env.irnRepository.addIrnLog({ type: "RefreshStarted", message: `Refresh tables started for ${env.config.crawlDaysLimit} days` })),
        chain(() => irnCrawler.refreshTables({ startDate: currentUtcDateString() })),
        chain(() => env.irnRepository.getIrnTablesCount()),
        chain(tablesCount =>
          env.irnRepository.addIrnLog({ type: "RefreshEnded", message: `Refresh tables ended (${tablesCount})` }),
        ),
        chain(() => irnCrawler.updateIrnPlacesLocation()),
        chain(() => irnCrawler.updateIrnTablesLocation()),
        mapLeft(e => {
          logDebug("ERROR: ", e)
          return e
        }),
      ),
    ),
  )

const start = (environment: Environment) => {
  if (isDev(environment.config)) {
    logDebug("App Config =====>\n", environment.config)
  }
  run(
    pipe(
      environment.irnRepository.getLastRefreshIrnLog(),
      chain(checkIsTimeToRun),
      chain(needsToRun => (needsToRun ? runProcess() : actionOf(undefined))),
      chain(() => environment.irnRepository.close()),
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

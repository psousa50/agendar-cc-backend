import { debug } from "console"
import { pipe } from "fp-ts/lib/pipeable"
import { chain, run } from "fp-ts/lib/ReaderTaskEither"
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
        run(
          pipe(
            irnCrawler.start(),
            chain(() => environment.irnRepository.updateConfig({ refreshStarted: new Date(Date.now()) })),
            chain(() =>
              environment.config.infra.useLocalIrnTables
                ? environment.irnRepository.addIrnTables(globalIrnTables)
                : irnCrawler.refreshTables({ startDate: new Date(Date.now()) }),
            ),
            chain(() => environment.irnRepository.updateConfig({ refreshEnded: new Date(Date.now()) })),
            chain(() => environment.irnRepository.end()),
          ),
          environment,
        )
        return task.of(undefined)
      },
    ),
  )

  await process()
}

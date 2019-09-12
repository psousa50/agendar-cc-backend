import { debug } from "console"
import { run } from "fp-ts/lib/ReaderTaskEither"
import { buildEnvironment } from "../environment"
import { irnCrawler } from "../irnCrawler/main"
import { globalIrnTables } from "../staticData/irnTables"
import { isDev } from "../utils/config"

const startWorker = async () => {
  const environment = buildEnvironment()

  debug("Worker Config =====>\n", environment.config)

  await run(irnCrawler.start(), environment)

  if (isDev(environment.config)) {
    environment.irnRepository.addIrnTables(globalIrnTables)
  } else {
    await run(irnCrawler.refreshTables({ startDate: new Date(Date.now()) }), environment)
  }
}

startWorker()

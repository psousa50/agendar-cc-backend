import { logDebug } from "../utils/debug"
import { startWorker } from "./main"

startWorker()
  .then(() => logDebug("Worker Terminated"), e => logDebug(`Error: ${e.message}`))
  .catch((e: any) => logDebug(`Error: ${e.message}`))

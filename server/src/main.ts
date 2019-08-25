import express, { Express } from "express"
import { pipe } from "fp-ts/lib/pipeable"
import { chain, fromTaskEither, map } from "fp-ts/lib/ReaderTaskEither"
import { tryCatch } from "fp-ts/lib/TaskEither"
import { Server } from "http"
import { ask, Action, pipe as pipeActions } from "../../shared/readerTaskEither"
import { buildStaticRouter } from "./frontend/static";
import { buildFrontendRouter } from "./frontend/router";
import { config as appConfig } from "../../shared/config"

export const createApp: Action<void, Express> = () =>
  pipe(
    ask(),
    map(_ => {
      const app: Express = express()

      app.use("/static", buildStaticRouter())
      app.use("/", buildFrontendRouter(appConfig))

      return app
    }),
  )

export const runServer: Action<Express, Server> = app =>
  pipe(
    ask(),
    chain(env =>
      fromTaskEither(
        tryCatch(
          () =>
            new Promise<Server>((resolve, reject) => {
              try {
                const port = env.config.port
                const server: Server = app.listen(port, () => {
                  return resolve(server)
                })
                server.on("checkContinue", (__, res) => {
                  res.writeContinue()
                })
                server.once("error", (err: Error) => {
                  return reject(err)
                })
              } catch (err) {
                reject(err)
              }
            }),
          (e: any) => e,
        ),
      ),
    ),
  )

console.log("exp=====>\n", )

export const expressApp = pipeActions(createApp, runServer)

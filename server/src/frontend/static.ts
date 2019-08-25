import express from "express"
import path from "path"

export const buildStaticRouter: () => express.Router = () => {
  const router = express.Router()

  router.get(
    "*",
    express.static(path.join("dist", "client", "static"), {
      extensions: ["css", "js"],
      index: false,
    }),
  )

  return router
}

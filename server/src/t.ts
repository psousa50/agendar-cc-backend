// import { pipe } from "fp-ts/lib/pipeable"
// import { map, mapLeft } from "fp-ts/lib/TaskEither"
// import { fetchAction } from "./utils/fetch"

// const x = pipe(
//   fetchAction("http://www.example.com/"),
//   map(r => console.log("=====>\n", r.ok, r.status, r.statusText, r.headers()),
//   mapLeft(e => console.log("ERR=====>\n", e)),
// )

// const y = async () => await x()

// y()

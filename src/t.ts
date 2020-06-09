import { left, right } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { chain, fromEither, orElse } from "fp-ts/lib/ReaderTaskEither"

const f = async () => {
  const t1 = fromEither<string, boolean, void>(left(false))
  // const t1 = fromEither<string, boolean, number>(right(2))

  const t2 = pipe(
    t1,
    chain(_ => fromEither<string, boolean, void>(right(undefined))),
  )

  const t3 = pipe(
    t2,
    orElse<string, boolean, void, boolean>(() => fromEither(right(undefined))),
  )

  return await t3("env")()
}

f().then(x => console.log("=====>\n", x))

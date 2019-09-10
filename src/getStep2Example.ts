import FormData from "form-data"
import fetch from "isomorphic-fetch"
import { debug } from "./utils/debug"

fetch("https://agendamento.irn.mj.pt/steps/step1.php").then(r =>
  r.text().then(html => {
    const i1 = html.indexOf(`name="tok" value=`) + `name="tok" value=`.length + 1
    const i2 = html.indexOf(`"`, i1 + 1)
    const tok = html.substring(i1, i2)

    const data = [
      ["tok", tok],
      ["servico", "1"],
      ["distrito", "12"],
      ["concelho", "7"],
      ["data_tipo", "primeira"],
      ["data", "2019-09-08"],
      ["sabado_show", "0"],
      ["servico_desc", "Pedido / Renovação de Cartão de Cidadão"],
      ["concelho_desc", "LISBOA"],
    ]

    const formData = new FormData()
    data.forEach(d => formData.append(d[0], d[1]))

    let cookies: string[] = []
    r.headers.forEach((v, k) => {
      if (k === "set-cookie") {
        cookies = [...cookies, v]
      }
    })

    const init = {
      body: formData.getBuffer().toString(),
      headers: {
        Cookie: cookies.join(","),
        "content-type": `multipart/form-data; boundary=${formData.getBoundary()}`,
      },
      method: "POST",
    }

    setTimeout(() => {
      fetch("https://agendamento.irn.mj.pt/steps/step2.php", init).then(res =>
        res.text().then(h => debug("=====>\n", h)),
      )
    }, 500)
  }),
)

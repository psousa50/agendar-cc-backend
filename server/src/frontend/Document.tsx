import React, { FunctionComponent } from "react"
import serialize from "serialize-javascript"
import { AppConfig } from "../../../shared/config";

export type DocumentProps = {
  assets: {
    [name: string]: any
  }
  clientConfig: AppConfig
  csrfToken: string
}

export const Document: FunctionComponent<DocumentProps> = ({ assets, clientConfig, csrfToken }) => {

  const h100 = `
    html, body, #root {
      height: 100%;
    }`

  return (
    <html>
      <head>
        <meta name="csrf" content={csrfToken} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" />
        {Object.keys(assets)
          .filter(chunk => !!assets[chunk].css)
          .map(chunk => (
            <link key={`asset.${chunk}.css`} href={assets[chunk].css} rel="stylesheet" type="text/css" />
          ))}
        <style dangerouslySetInnerHTML={{ __html: h100 }} />
      </head>
      <body>
        <div id="root" />
        <script
          id="preloaded"
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `window.__PRELOADED__=${serialize({ config: clientConfig })}`,
          }}
        />
        {Object.keys(assets)
          .sort()
          .filter(chunk => !!assets[chunk].js)
          .map(chunk => (
            <script key={`asset.${chunk}.js`} src={assets[chunk].js} type="text/javascript" />
          ))}
      </body>
    </html>
  )
}

import cx from "classnames"
import React from "react"
import { Home } from "./containers/Home"

export class App extends React.Component {
  public render() {
    return (
      <div className={cx("container-fluid")}>
        <Home />
      </div>
    )
  }
}

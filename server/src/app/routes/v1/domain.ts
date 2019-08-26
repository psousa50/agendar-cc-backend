import { Action, actionOf } from "../../../../../shared/actions"
import { IrnTables } from "../../../irnRepository/models"

export const findIrnTables: Action<{}, IrnTables> = () => actionOf([])

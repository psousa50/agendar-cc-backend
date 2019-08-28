import { Action, actionOf } from "../../../../../shared/actions"
import { IrnRepositoryTables } from "../../../irnRepository/models"

export const findIrnTables: Action<{}, IrnRepositoryTables> = () => actionOf([])

import { Action, actionOf } from "../../../../../shared/actions"
import * as Repository from "../../../irnRepository/main"
import { IrnRepositoryTables } from "../../../irnRepository/models"

export const getIrnTables: Action<{}, IrnRepositoryTables> = () => actionOf(Repository.getIrnTables())

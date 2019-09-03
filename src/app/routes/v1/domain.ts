import * as Repository from "../../../irnRepository/main"
import { IrnRepositoryTables } from "../../../irnRepository/models"
import { Action, actionOf } from "../../../utils/actions"

export const getIrnTables: Action<{}, IrnRepositoryTables> = () => actionOf(Repository.getIrnTables())

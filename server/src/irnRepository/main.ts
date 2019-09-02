import { isNil } from "ramda"
import { IrnTables } from "../irnFetch/models"
import { Counties, Districts, IrnServices } from "./models"

interface Repository {
  counties: Counties
  districts: Districts
  irnServices: IrnServices
  irnTables: IrnTables
}

const Repository: Repository = {
  counties: [],
  districts: [],
  irnServices: [],
  irnTables: [],
}

export const addCounties = (counties: Counties) => {
  Repository.counties = [...Repository.counties, ...counties]
}

export const addDistricts = (districts: Districts) => {
  Repository.districts = [...Repository.districts, ...districts]
}

export const addIrnTables = (irnTables: IrnTables) => {
  Repository.irnTables = [...Repository.irnTables, ...irnTables]
}

export const addIrnServices = (irnServices: IrnServices) => {
  Repository.irnServices = [...Repository.irnServices, ...irnServices]
}

export const clearAll = () => {
  Repository.counties = []
  Repository.districts = []
  Repository.irnServices = []
  Repository.irnTables = []
}

export const clearAllTables = () => {
  Repository.irnTables = []
}

export const getCounties = (districtId?: number) =>
  Repository.counties.filter(c => isNil(districtId) || c.districtId === districtId)

export const getDistricts = () => Repository.districts

export const getIrnServices = () => Repository.irnServices

export const getIrnTables = () => Repository.irnTables

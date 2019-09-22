// tslint:disable: object-literal-sort-keys

const irnTables = [
  {
    _id: "5d85e42fd99fe300049ca8e2",
    address: "Rua dos Combatentes da Grande Guerra, nº 64",
    countyId: 24,
    date: "2019-09-23T00:00:00.000Z",
    districtId: 5,
    placeName: "Espaço Registos Bragança",
    phone: "",
    postalCode: "5300-113",
    serviceId: 1,
    tableNumber: "2",
    timeSlots: [
      "09:15:00",
      "09:30:00",
      "10:00:00",
      "11:00:00",
      "11:30:00",
      "11:45:00",
      "12:00:00",
      "12:15:00",
      "14:30:00",
      "15:00:00",
      "15:15:00",
      "15:30:00",
      "15:45:00",
    ],
  },
]

export const globalIrnTables = irnTables.map(t => ({
  ...t,
  date: new Date(t.date),
}))

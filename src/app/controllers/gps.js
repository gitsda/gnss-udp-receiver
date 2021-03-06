'use strict'

import * as parser from '~/app/utils/gnss-parser'
import Gnss from '~/app/models/gnss'
import Location from '~/app/models/location'
import logger from '~/config/logger'
import ua from 'universal-analytics'
import * as utils from '~/app/utils/utils'
import locationApi from '~/app/apis/location'

const visitor = ua('UA-97830439-1')

export const onReceive = (message) => {
  let messages = message.toString('UTF-8')
  messages = messages.split('$')
  let datas = []
  for (let m of messages) {
    if (m) {
      let data = parser.parse(m)
      if (data) {
        logger.debug `push  ${data}`
        if (data.imei) {
          visitor.pageview('/udp-' + data.imei).send()
        }
        datas.push(data)
      }
    }
  }
  return datas
}

export const save = async(datas) => {
  let isSaveFirstLocation = false
  let promises = []
  for (let data of datas) {
    promises.push(new Gnss(data).save())
    if (!isSaveFirstLocation) {
      let hash = utils.createLocationHash(data)
      let location = await Location.findOne({hash: hash})
      if (!location) {
        location = {type: 'GNSS', date: data.date, coord: data.coord, hdop: data.hdop, uuid: data.imei}
        promises.push(locationApi(location))
        isSaveFirstLocation = true
      }

    }
  }
  await Promise.all(promises)
}
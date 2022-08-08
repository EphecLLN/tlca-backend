import { describe, it } from 'mocha'
import chai from 'chai'

import { schema } from '../data/schema.js'

chai.should()

describe('Test Static Schema Snapshot', () => {
  it('schema should contain types', () => {
    chai.assert.isNotNull(schema.getType('Course'))
    chai.assert.isDefined(schema.getType('Course'))
  })

  it('scheme should not contain unregistered types', () => {
    chai.assert.isUndefined(
      schema.getType('NotADefinedType', 'Type should not be defined')
    )
  })
})

'use strict'

const params = {}

module.exports = function describeInstanceHealth(AWS) {
  let elbs = []
  const elb = new AWS.ELB()

  return function describe(loadBalancerName, nextMarker = null) {
    params.LoadBalancerName = loadBalancerName
    if (nextMarker) {
      params.NextMarker = nextMarker
    }

    return elb.describeInstanceHealth(params).promise()
      .then((result) => {
        elbs = elbs.concat(result.InstanceStates)

        if (result.NextMarker) {
          return describe(loadBalancerName, result.NextMarker)
        }

        return elbs
      })
  }
}

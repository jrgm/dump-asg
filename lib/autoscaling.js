'use strict'

const params = {
  MaxRecords: 100
}

module.exports = function describeAutoScalingGroups(AWS) {
  let groups = []
  const autoscaling = new AWS.AutoScaling()

  return function describe(nextToken = null) {
    if (nextToken) {
      params.NextToken = nextToken
    }

    return autoscaling.describeAutoScalingGroups(params).promise()
      .then((result) => {
        groups = groups.concat(result.AutoScalingGroups)

        if (result.NextToken) {
          return describe(result.NextToken)
        }

        return groups
      })
  }
}

#!/usr/bin/env node
'use strict'

const AWS = require('aws-sdk')
const P = require('bluebird')
const printf = require('printf')

const profile = 'default'
const region = 'us-east-1'

const credentials = new AWS.SharedIniFileCredentials({ profile: profile })
AWS.config.credentials = credentials
AWS.config.update({ region: region })
AWS.config.setPromisesDependency(P)

const describeAutoScalingGroups = require('./lib/autoscaling')(AWS)
const describeInstanceHealth = require('./lib/elb')(AWS)

function instanceState(elbStates, instance) {
  const elbState = elbStates[instance.InstanceId]
  return {
    health: instance.HealthStatus,
    state: instance.LifecycleState,
    elb: elbState || 'undefined'
  }
}

function elbStates(elbs) {
  const instances = {}
  elbs.forEach((elb) => {
    instances[elb.InstanceId] = elb.State
  })
  return instances
}

function handler(asgs, elbs) {
  const instanceElbStates = elbStates(elbs)
  asgs.filter((asg) => {
    return /^fxa-auth-stage-default/.test(asg.AutoScalingGroupName)
  }).sort((a, b) => a.AutoScalingGroupName < b.AutoScalingGroupName).forEach((asg) => {
    const name = asg.AutoScalingGroupName.split('-').slice(4,6).join('-')
    const desiredCapacity = asg.DesiredCapacity
    const minSize = asg.MinSize
    const maxSize = asg.MaxSize
    const createdTime = new Date(asg.CreatedTime).toISOString().replace(/.*T/, '')
    const loadBalancers = asg.LoadBalancerNames.filter((lb) => ! /QAELB/.test(lb)).sort().reverse().join(',')
    const instances = JSON.stringify(asg.Instances.map(instanceState.bind(null, instanceElbStates)))
    const instanceCount = asg.Instances.length
    printf(process.stdout, '%s %-10s %d/%d/%d/%d - %s - %s\n',
           createdTime, name, instanceCount, desiredCapacity,
           minSize, maxSize, instances, loadBalancers)
  })
}


function main() {
  const promises = [ describeAutoScalingGroups(), describeInstanceHealth('fxa-auth-elb-s-ELB-4ZKPZR3NCBI2') ]
  P.all(promises).spread(handler)
}

main()

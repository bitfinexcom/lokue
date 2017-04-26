const _ = require('lodash')
const Lokue = require(`${__dirname}./../index`)

const lok = new Lokue({
  name: 'lokue-test',
  persist: true,
  concurrency: 10,
  timeout_save: 100
})

lok.init((err) => {
  if (err) {
    console.error(err)
    process.exit()
  }

  setInterval(() => {
    lok.addJob({ hello: _.random(10000) })
  }, 1000)
})

lok.on('job', job => {
  console.log('processing', job.data)
  job.done()
})

setInterval(() => {
  if (lok.isReady()) {
    lok.requeueStuckJobs()
    lok.clearCompletedJobs()
  }
}, 1000)

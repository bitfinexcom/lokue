# lokue: LokiJS Job Queue

Simple LokiJS Job Queue management


```
const lok = new Lokue({
  name: 'lokue-test',
  persist: true,
  concurrency: 10,
  timeout_save: 100
})

lok.init((err) => {
  let ix = 0
  setInterval(() => {
    ix++
    lok.addJob({ hello: 'world' + ix })
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
```


# lokue: LokiJS Job Queue

Simple [LokiJS](http://lokijs.org/) Job Queue management

### Features
* Persist to file
* Fast (configurable concurrency)
* Small library

### Example

```
const lok = new Lokue({
  name: 'lokue-test.json',
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

### Contributors
* Paolo Ardoino <paolo@bitfinex.com> / <paolo.ardoino@gmail.com>

const EventEmitter = require('events')
const async = require('async')
const _ = require('lodash')
const Loki = require('lokijs')

class Lokue extends EventEmitter {
  
  constructor(opts = {}) {
    super()

    this.opts = _.defaults({
      timeout_tick: 50,
      timeout_save: 5000,
      concurrency: 5
    }, opts)
  }

  isReady() {
    return this._ready
  }
  
  init(cb) {
    this._ready = false

    this.db = new Loki(this.opts.name, {

    })

    this.queue = async.queue(
      this.processJob.bind(this), this.opts.concurrency
    )

    this.load((err) => {
      if (err) return cb(err) 
      this._initDB()
      this._initTimers()
      this._ready = true
      cb()
    })
  }
  
  _initTimers() {
    this._tickItv = setInterval(this.tick.bind(this), this.opts.timeout_tick)
    this._savetv = setInterval(this.save.bind(this), this.opts.timeout_save)
  }

  _initDB() {
    if (!this.db.getCollection('jobs')) {
      const jobs = this.db.addCollection('jobs', {
        indices: ['id', 'status', 'ts_created', 'ts_updated']
      })
      jobs.ensureUniqueIndex('id')
    }

    this.jobs = this.db.getCollection('jobs')
  }

  stop(cb) {
    this._ready = false

    this._clearInterval(this._tickItv)
    this._clearInterval(this._saveItv)

    this.save(cb)
  }

  load(cb) {
    if (!this.opts.persist) return cb()
    this.db.loadDatabase({}, cb)
  }

  save(cb) {
    if (!this.opts.persist) return cb()
    this.db.saveDatabase(cb)
  }

  addJob(data) {
    const jid = Date.now()

    this.jobs.insert({
      id: jid,
      status: 'ACTIVE',
      ts_created: Date.now(),
      ts_updated: Date.now(),
      data: data
    })

    return jid
  }

  delJob(job) {
    this.jobs.remove(job)
  }

  updJob(job) {
    job.ts_update = Date.now()
    this.jobs.update(job)
  }

  doneJob(job, err) {
    if (err) {
      job.status = 'ERROR'
    } else {
      job.status = 'COMPLETED'
    }
    this.updJob(job)
  }

  requeueJob(job) {
    job.status = 'ACTIVE'
    this.updJob(job)
  }

  processJob(jid, cb) {
    const job = this.jobs.by('id', jid)
    if (!job) return cb()

    this.emit('job', {
      id: job.id,
      data: job.data,
      done: (err) => {
        this.doneJob(job, err)
        cb()
      }
    })
  }

  listStuckJobs() {
    return this.jobs.chain().find({ status: 'PROCESSING' })
      .simplesort('ts_updated').data()
  }

  requeueStuckJobs() {
    this.jobs.findAndUpdate({ status: 'PROCESSING' }, (job) => {
      job.status = 'PROCESSING'
      this.updJob(job)
    })
  }

  listCompletedJobs() {
    return this.jobs.chain().find({ status: 'COMPLETED' })
      .simplesort('ts_updated').data()
  }

  clearCompletedJobs() {
    this.jobs.findAndRemove({ status: 'COMPLETED' })
  }

  tick() {
    if (this.queue.size > 100) return
    const jobs = this.jobs.chain().find({ status: 'ACTIVE' })
      .simplesort('ts_updated').data()

    _.each(jobs, job => {
      job.status = 'PROCESSING'
      this.updJob(job)
      this.queue.push(job.id)
    })
  }
}

module.exports = Lokue

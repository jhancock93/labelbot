const schema = require('./schema')
const ignore = require('ignore')
const matchPattern = require('./matchPattern')


module.exports = class Label {
  constructor (github, { owner, repo, logger = console, ...config }) {
    this.github = github
    this.logger = logger

    const { error, value } = schema.validate(config)

    this.config = value
    if (error) {
      // Report errors to sentry
      logger.warn({ err: new Error(error), owner, repo }, 'Invalid config')
    }

    this.logger.debug('Configuration:' + JSON.stringify(config))
    Object.assign(this.config, { owner, repo, error })
  }

  async apply(context) {
    const { label, error } = this.config
    const { title, html_url: htmlUrl } = context.payload.pull_request

    this.logger.info(`Processing PR "${title}" ( ${htmlUrl} )`)
    if (error) {
      this.logger.warn('Not updating PR')
      return
    }

    const labels = new Set()
    if (label) {
      if (!context.payload.repository.private) {
        this.logger.info(`Updating PR with static label from config "${title}" ( ${htmlUrl} ): "${label}"`)
      }
      labels.add(label)
    }

    const targetBranch = context.payload.pull_request.base.ref
    this.logger.debug(`Target branch for PR is "${targetBranch}"`)
    if (this.config.branchLabels) {
      Object.keys(this.config.branchLabels).forEach(key => {
        const pattern = this.config.branchLabels[key]
        this.logger.debug(`Testing if branch ${targetBranch} matches pattern ${pattern}`)
        if (matchPattern(pattern, targetBranch)) {
          labels.add(key)
        }
      })
    }

    this.logger.debug(`Pulling files for PR ${context.payload.pull_request.number}`)
    const files = await context.github.pulls.listFiles(context.repo({ pull_number: context.payload.pull_request.number }))
    const changedFiles = files.data.map(file => file.filename)
    if (changedFiles && changedFiles.length > 0) {
      Object.keys(this.config.pathLabels).forEach(key => {
        const value = this.config.pathLabels[key]
        this.logger.info('Examining file changes for label', key, value)
        const matcher = ignore().add(value)

        if (changedFiles.find(file => matcher.ignores(file))) {
          labels.add(key)
        }
      })
    }

    const labelsToAdd = Array.from(labels)

    this.logger.info('Adding labels', labelsToAdd)
    if (labelsToAdd.length > 0) {
      return context.github.issues.addLabels(context.issue({
        labels: labelsToAdd
      }))
    }
  }
}

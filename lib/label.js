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

    Object.assign(this.config, { owner, repo, error })
  }

  async apply (context) {
    const { label, error } = this.config
    const { title, html_url: htmlUrl } = context.payload.pull_request

    if (error) {
      this.logger.warn('Not updating PR')
      return
    }

    const labels = new Set()
    if (label) {
      if (!context.payload.repository.private) {
        this.logger.info(`Updating PR "${title}" ( ${htmlUrl} ): "${label}"`)
      }
      labels.add(label)
    }

    const files = await context.github.pullRequests.getFiles(context.issue())
    const changedFiles = files.data.map(file => file.filename)
    const targetBranch = await context.github.pullRequests.targetBranch

    for (const [key, value] in Object.getEntries(this.config.pathLabels)) {
      this.logger.info('Examining file changes for label', key, value)
      const matcher = ignore().add(value)

      if (changedFiles.find(file => matcher.ignores(file))) {
        labels.add(key)
      }
    }

    for (const [key, value] in Object.getEntries(this.config.branchLabels)) {
      this.logger.info('Examining branch rules: ', key, value)
      for (const pattern in value) {
        if (matchPattern(pattern, targetBranch)) {
          labels.add(key)
        }
      }
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

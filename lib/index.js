const getConfig = require('probot-config')
const Label = require('./label')

module.exports = async robot => {
  const events = [
    'pull_request.opened',
    'pull_request.reopened',
    'pull_request.synchronize'
  ]

  robot.on(events, autolabelCheck)

  async function autolabelCheck(context) {
    context.log.debug('Received event')
    const label = await forRepository(context)
    label.apply(context)
  }

  async function forRepository(context) {
    context.log.debug('Checking configuration...')
    let config = await getConfig(context, 'labelbot.yml')

    if (!config) {
      context.log.debug('Empty configuration found, using defaults...')
      config = {
        branchLabels: { release: 'release-.*' },
        pathLabels: {
          docs: ['*.md', 'docs/*']
        }
      }
    }

    config = Object.assign(config, context.repo({ logger: robot.log }))
    return new Label(context.github, config)
  }
}

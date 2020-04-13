const getConfig = require('probot-config')
const Label = require('./label')

module.exports = async robot => {
  const events = [
    'pull_request.opened',
    'pull_request.synchronize'
  ]

  robot.on(events, autolabelCheck)

  async function autolabelCheck (context) {
    const label = await forRepository(context)
    label.apply(context)
  }

  async function forRepository (context) {
    let config = await getConfig(context, 'labelbot.yml')

    if (!config) {
      config = {}
    }

    config = Object.assign(config, context.repo({ logger: robot.log }))
    return new Label(context.github, config)
  }
}

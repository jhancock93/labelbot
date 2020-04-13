const Joi = require('@hapi/joi')
const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('..')
const schema = require('../lib/schema')

const { Probot } = require('probot')
// Requiring our fixtures
const pullRequest1 = require('./fixtures/pull_request_docs.opened.json')
// const validConfig = require('./fixtures/validConfiguration.yml')
// const issueCreatedBody = { body: 'Thanks for opening this issue!' }
const fs = require('fs')
const path = require('path')

describe('schema validation tests', () => {
  test('schema validates correct format', () => {
    Joi.assert({ pathLabels: { frontend: ['*.js'], docs: ['*.md', '*.txt'] } }, schema)
  }
  )

  test('pathLabels requires non-empty array for label', () => {
    const func = () => { Joi.assert({ pathLabels: { frontend: ['*.js'], docs: [] } }, schema) }
    expect(func).toThrow()
  })
})

describe('My Probot app', () => {
  let probot
  let mockCert

  beforeAll((done) => {
    fs.readFile(path.join(__dirname, 'fixtures/mock-cert.pem'), (err, cert) => {
      if (err) return done(err)
      mockCert = cert
      done()
    })
  })

  beforeEach(() => {
    nock.disableNetConnect()
    probot = new Probot({ id: 123, cert: mockCert, githubToken: 'test' })
    // Load our app into probot
    probot.load(myProbotApp)
  })

  test('tests that a label is added based on markdown change', async () => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/60731/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a label is applied
    nock('https://api.guthub.com')
      .patch('/repos/jhancock93/probot-test/issues/1', (body) => {
        expect(body).toMatchObject({ labels: ['docs'] })
        return true
      })
      .reply(200)

    await probot.receive({ name: 'pull_request', pullRequest1 })
  })
  /*
  test('creates a comment when an issue is opened', async () => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', (body) => {
        expect(body).toMatchObject(issueCreatedBody)
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'issues', payload })
  })
*/
  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock

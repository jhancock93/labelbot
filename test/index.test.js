const Joi = require('@hapi/joi')
const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('..')
const schema = require('../lib/schema')

const { Probot } = require('probot')
// Requiring our fixtures
const pullRequest1 = require('./fixtures/pull_request_master.opened.json')

// const validConfig = require('./fixtures/validConfiguration.yml')

const fs = require('fs')
const path = require('path')

describe('schema validation tests', () => {
  test('schema validates correct format', () => {
    Joi.assert({ pathLabels: { frontend: ['*.js'], docs: ['*.md', '*.txt'] } }, schema)
  })

  test('pathLabels requires non-empty array for label', () => {
    const func = () => { Joi.assert({ pathLabels: { frontend: ['*.js'], docs: [] } }, schema) }
    expect(func).toThrow()
  })

  test('branchLabels accepts tags with regex values', () => {
    Joi.assert({ branchLabels: { release: 'release-.*', trunk: '(master|develop)' } }, schema)
  })
})

function doNockGetAccessToken () {
  // Test that we correctly return a test token
  nock('https://api.github.com')
    .log(console.log)
    .post('/app/installations/60731/access_tokens')
    .reply(200, { token: 'test' })
}

function doNockConfigRequests () {
  // bot will try to read config file from repo
  nock('https://api.github.com')
    .get('/repos/jhancock93/probot-test/contents/.github/labelbot.yml')
    .reply(404)
  // .reply(200, validConfig)

  // next, bot will try .github repo for .github/labelbot.yml
  nock('https://api.github.com')
    .get('/repos/jhancock93/.github/contents/.github/labelbot.yml')
    .reply(404)
}

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
    const app = probot.load(myProbotApp)

    // just return a test token
    app.app = () => 'test'
  })


  test('tests that a label is added based on markdown change', async () => {
    // files that include a markdown file
    const prFilesMarkdown = require('./fixtures/prFiles-markdown.json')

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/60731/access_tokens')
      .reply(200, { token: 'test' })

    doNockConfigRequests()

    nock('https://api.github.com')
      .log(console.log)
      .get('/repos/jhancock93/probot-test/pulls/1/files')
      .reply(200, prFilesMarkdown.data)

    // Test that a label is applied
    nock('https://api.guthub.com')
      .patch('/repos/jhancock93/probot-test/issues/1', (body) => {
        expect(body).toMatchObject({ labels: ['docs'] })
        return true
      })
      .reply(200)

    await probot.receive({ name: 'pull_request', payload: pullRequest1 })
    console.error('pending mocks: %j', nock.pendingMocks())
    expect(nock.isDone()).toBe(true)
  })


  /*
    test('tests that a label is added based on target branch', async () => {
      const pullRequestReleaseBranch = require('./fixtures/pull_request_targetBranch.opened.json')
      const prFilesOther = require('./fixtures/prFiles-other.json')
  
      // doNockGetAccessToken()
      doNockConfigRequests()
  
      nock('https://api.github.com')
        .log(console.log)
        .get('/repos/jhancock93/probot-test/pulls/2/files')
        .reply(200, prFilesOther.data)
  
      // Test that a branch-based label is applied
      nock('https://api.guthub.com')
        .log(console.log)
        .patch('/repos/jhancock93/probot-test/issues/2', (body) => {
          expect(body).toMatchObject({ labels: ['release'] })
          return true
        })
        .reply(200)
  
      await probot.receive({ name: 'pull_request', payload: pullRequestReleaseBranch })
      console.error('pending mocks: %j', nock.pendingMocks())
      expect(nock.isDone()).toBe(true)
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

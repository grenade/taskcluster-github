suite('pulse', () => {
  let helper = require('./helper');
  let assert = require('assert');

  let github = null;

  setup(async () => {
    github = await helper.load('github');
    github.inst(5808).setUser({id: 14795478, email: 'someuser@github.com'});
    github.inst(5808).setUser({id: 18102552, email: 'anotheruser@github.com'});
  });

  /**
   * Run a test which verifies that pulse messages are being produced
   * for valid webhook requests.
   * params: {
   *  testName:     'some test',
   *  listenFor:    'some event type',
   *  exchangeFunc: 'name of exchange function',
   *  routingKey:   {...}, a dict containing a pulse routing key
   *  details:      {...}, a dict of details we expect to seein the msg payload
   *  jsonFile:     'data file'
   **/
  function pulseTest(params) {
    test(params.testName, async () => {
      // Trigger a pull-request message
      let res = await helper.jsonHttpRequest('./test/data/webhooks/' + params.jsonFile);
      res.connection.destroy();

      assert(helper.publisher[params.exchangeFunc].calledOnce);
      let call = helper.publisher[params.exchangeFunc].getCall(0);
      assert.equal(call.args[0].organization, params.routingKey.organization);
      assert.equal(call.args[0].repository, params.routingKey.repository);
      assert.equal(call.args[0].installationId, params.routingKey.installationId);
      for (let key of Object.keys(params.details)) {
        assert.equal(call.args[0].details[key], params.details[key]);
      }
    });
  };

  pulseTest({
    testName:     'Publish Pull Request',
    listenFor:    'pull-request',
    exchangeFunc: 'pullRequest',
    routingKey:   {
      organization: 'TaskClusterRobot',
      repository:   'hooks-testing',
      action:       'opened',
      installationId: 5808,
    },
    details:      {},
    jsonFile:     'webhook.pull_request.open.json',
  });

  pulseTest({
    testName:     'Publish Push',
    listenFor:    'push',
    exchangeFunc: 'push',
    routingKey:   {
      organization: 'TaskClusterRobot',
      repository:   'hooks-testing',
      installationId: 5808,
    },
    details:      {
      'event.head.ref': 'refs/heads/master',
      'event.head.repo.branch': 'master',
      'event.base.repo.branch': 'master',
    },
    jsonFile:     'webhook.push.json',
  });

  pulseTest({
    testName:     'Publish Release',
    listenFor:    'release',
    exchangeFunc: 'release',
    routingKey:   {
      organization: 'TaskClusterRobot',
      repository:   'hooks-testing',
      installationId: 5808,
    },
    details:      {
      'event.version': 'testing-789',
      'event.base.repo.branch': 'master',
    },
    jsonFile:     'webhook.release.json',
  });
});

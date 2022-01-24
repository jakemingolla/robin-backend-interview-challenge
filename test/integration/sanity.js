const { expect } = require('chai');
const { makeAPIRequest } = require('./utilities');

describe('sanity tests', () => {
  it('has a /ping endpoint', async () => {
    const response = await makeAPIRequest('GET', '/ping');

    expect(response.statusCode).to.equal(200);
    expect(response.body.message).to.equal('Hello!');
  });

  it('404s unknown requests', async () => {
    const response = await makeAPIRequest('GET', '/unknown');

    expect(response.statusCode).to.equal(404);
    expect(response.body.message).to.equal('No matching route.');
  });
});

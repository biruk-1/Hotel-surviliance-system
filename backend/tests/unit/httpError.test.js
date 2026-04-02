const HttpError = require('../../src/utils/httpError');

describe('HttpError', () => {
  it('sets statusCode and message', () => {
    const err = new HttpError(404, 'Not found');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('HttpError');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
  });
});

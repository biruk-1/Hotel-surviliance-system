const { authorizeRoles, requireHotelAccess } = require('../../src/middlewares/rbac.middleware');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authorizeRoles', () => {
  it('calls next when user role is allowed', () => {
    const next = jest.fn();
    const req = { user: { role: 'admin' } };
    authorizeRoles('admin', 'police')(req, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows hotel when hotel is in the list', () => {
    const next = jest.fn();
    const req = { user: { role: 'hotel' } };
    authorizeRoles('hotel')(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when req.user is missing', () => {
    const next = jest.fn();
    const res = mockRes();
    const req = {};
    authorizeRoles('admin')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Authentication required' }),
      })
    );
  });

  it('returns 403 when role is not in allowed list', () => {
    const next = jest.fn();
    const res = mockRes();
    const req = { user: { role: 'hotel' } };
    authorizeRoles('admin', 'police')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Insufficient permissions' }),
      })
    );
  });
});

describe('requireHotelAccess', () => {
  const hotelId = '11111111-1111-1111-1111-111111111111';

  it('allows police without checking scope', () => {
    const next = jest.fn();
    const req = { user: { role: 'police' }, params: { hotelId } };
    requireHotelAccess()(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.hotelId).toBe(hotelId);
  });

  it('allows admin without checking scope', () => {
    const next = jest.fn();
    const req = { user: { role: 'admin' }, params: { hotelId } };
    requireHotelAccess()(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.hotelId).toBe(hotelId);
  });

  it('allows hotel role when hotelId is in accessibleHotelIds', () => {
    const next = jest.fn();
    const req = {
      user: { role: 'hotel' },
      accessibleHotelIds: [hotelId, 'other-id'],
      params: { hotelId },
    };
    requireHotelAccess()(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.hotelId).toBe(hotelId);
  });

  it('returns 403 for hotel role when hotelId is not in scope', () => {
    const next = jest.fn();
    const res = mockRes();
    const req = {
      user: { role: 'hotel' },
      accessibleHotelIds: ['other-id'],
      params: { hotelId },
    };
    requireHotelAccess()(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 for hotel role when accessibleHotelIds is undefined', () => {
    const next = jest.fn();
    const res = mockRes();
    const req = { user: { role: 'hotel' }, params: { hotelId } };
    requireHotelAccess()(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].error.message).toContain('Hotel scope');
  });

  it('returns 400 when hotelId param is missing', () => {
    const next = jest.fn();
    const res = mockRes();
    const req = { user: { role: 'police' }, params: {} };
    requireHotelAccess()(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 when user is missing', () => {
    const next = jest.fn();
    const res = mockRes();
    const req = { params: { hotelId } };
    requireHotelAccess()(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 for unknown role', () => {
    const next = jest.fn();
    const res = mockRes();
    const req = { user: { role: 'unknown' }, params: { hotelId } };
    requireHotelAccess()(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

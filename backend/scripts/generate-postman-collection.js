const fs = require('fs');
const path = require('path');

const auth = [{ key: 'Authorization', value: 'Bearer {{accessToken}}', type: 'text' }];

function jsonBody(obj) {
  return {
    mode: 'raw',
    raw: JSON.stringify(obj, null, 2),
    options: { raw: { language: 'json' } },
  };
}

function reqJson(method, name, pathSuffix, body, useAuth = true) {
  let headers = [];
  if (useAuth === 'jsonNoAuth') {
    headers = [{ key: 'Content-Type', value: 'application/json', type: 'text' }];
  } else if (useAuth === true) {
    headers = [
      { key: 'Content-Type', value: 'application/json', type: 'text' },
      ...auth,
    ];
  } else if (useAuth === false) {
    headers = [];
  }

  const r = {
    name,
    request: {
      method,
      header: headers,
      url: `{{baseUrl}}${pathSuffix}`,
    },
  };
  if (body !== undefined && body !== null) {
    r.request.body = jsonBody(body);
  }
  return r;
}

const collection = {
  info: {
    name: 'Hotel Surveillance API',
    description:
      'Set collection variables: baseUrl (http://localhost:5001/api), accessToken (paste token from Login). Replace hotelId, guestId, stayId, alertId, blacklistEntryId with real UUIDs from your DB.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:5001/api' },
    { key: 'accessToken', value: '' },
    { key: 'hotelId', value: '00000000-0000-0000-0000-000000000001' },
    { key: 'guestId', value: '00000000-0000-0000-0000-000000000002' },
    { key: 'stayId', value: '00000000-0000-0000-0000-000000000003' },
    { key: 'alertId', value: '00000000-0000-0000-0000-000000000004' },
    { key: 'blacklistEntryId', value: '00000000-0000-0000-0000-000000000005' },
  ],
  item: [
    {
      name: 'Health',
      item: [reqJson('GET', 'Health check', '/health', null, false)],
    },
    {
      name: 'Auth',
      item: [
        reqJson(
          'POST',
          'Register',
          '/auth/register',
          {
            email: 'staff@hotel.com',
            password: 'securepass12',
            fullName: 'Test User',
            role: 'hotel',
          },
          'jsonNoAuth'
        ),
        reqJson(
          'POST',
          'Login',
          '/auth/login',
          { email: 'staff@hotel.com', password: 'securepass12' },
          'jsonNoAuth'
        ),
      ],
    },
    {
      name: 'Guests',
      item: [
        reqJson('POST', 'Create guest + stay', '/guests', {
          fullName: 'Jane Doe',
          idNumber: 'PASS-001',
          hotelId: '{{hotelId}}',
          checkIn: '2026-04-01T14:00:00.000Z',
          roomNumber: '101',
          dateOfBirth: '1990-05-15',
          status: 'active',
        }),
        reqJson('GET', 'List guests', '/guests', null),
        reqJson('GET', 'List guests (hotelId query)', '/guests?hotelId={{hotelId}}', null),
        reqJson('GET', 'Get guest by ID', '/guests/{{guestId}}', null),
      ],
    },
    {
      name: 'Stays',
      item: [
        reqJson('POST', 'Create stay', '/stays', {
          guestId: '{{guestId}}',
          hotelId: '{{hotelId}}',
          checkIn: '2026-04-02T12:00:00.000Z',
          roomNumber: '205',
          status: 'active',
        }),
      ],
    },
    {
      name: 'Alerts',
      item: [
        reqJson('GET', 'List alerts', '/alerts', null),
        {
          name: 'Mark alert reviewed (PATCH)',
          request: {
            method: 'PATCH',
            header: auth,
            url: '{{baseUrl}}/alerts/{{alertId}}',
          },
        },
      ],
    },
    {
      name: 'Blacklist top-level',
      item: [
        reqJson('GET', 'List blacklist', '/blacklist', null),
        reqJson('GET', 'List blacklist (hotelId)', '/blacklist?hotelId={{hotelId}}', null),
        reqJson('POST', 'Create blacklist', '/blacklist', {
          hotelId: '{{hotelId}}',
          name: 'Blocked Person',
          idNumber: 'BLK-001',
          dateOfBirth: '1985-03-20',
          reason: 'Test',
        }),
      ],
    },
    {
      name: 'Hotels nested',
      item: [
        reqJson('GET', 'Alerts for hotel', '/hotels/{{hotelId}}/alerts', null),
        reqJson('GET', 'Blacklist for hotel', '/hotels/{{hotelId}}/blacklist', null),
        reqJson('POST', 'Create blacklist (nested)', '/hotels/{{hotelId}}/blacklist', {
          name: 'Blocked Person',
          idNumber: 'BLK-002',
          dateOfBirth: '1985-03-20',
          reason: 'Nested',
        }),
        {
          name: 'Delete blacklist entry',
          request: {
            method: 'DELETE',
            header: auth,
            url: '{{baseUrl}}/hotels/{{hotelId}}/blacklist/{{blacklistEntryId}}',
          },
        },
      ],
    },
    {
      name: 'Documents',
      item: [
        {
          name: 'Upload ID document',
          request: {
            method: 'POST',
            header: auth,
            body: {
              mode: 'formdata',
              formdata: [
                { key: 'stayId', value: '{{stayId}}', type: 'text' },
                { key: 'title', value: 'ID document', type: 'text' },
                {
                  key: 'file',
                  type: 'file',
                  src: [],
                  description: 'Choose JPEG, PNG, GIF, WebP, or PDF (max 5 MB)',
                },
              ],
            },
            url: '{{baseUrl}}/documents',
            description:
              'Body: form-data. After import, pick a file for the "file" key.',
          },
        },
      ],
    },
  ],
};

const out = path.join(__dirname, '..', 'apis.json');
fs.writeFileSync(out, JSON.stringify(collection, null, 2), 'utf8');
console.log('Wrote', out);

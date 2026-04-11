const { param, query, body } = require('express-validator');
const { paginationRules } = require('../guests/guests.validation');

const alertIdParamRules = [param('id').isUUID().withMessage('Invalid alert id')];

const listAlertsQueryRules = [...paginationRules];

const unreadCountQueryRules = [
  query('hotelId').optional({ values: 'null' }).isUUID().withMessage('Invalid hotelId'),
];

const readAllBodyRules = [
  body('hotelId').optional({ values: 'null' }).isUUID().withMessage('Invalid hotelId'),
];

module.exports = {
  alertIdParamRules,
  listAlertsQueryRules,
  unreadCountQueryRules,
  readAllBodyRules,
};

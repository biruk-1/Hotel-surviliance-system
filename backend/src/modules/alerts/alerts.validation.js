const { param, query } = require('express-validator');
const { paginationRules } = require('../guests/guests.validation');

const alertIdParamRules = [param('id').isUUID().withMessage('Invalid alert id')];

const listAlertsQueryRules = [...paginationRules];

module.exports = {
  alertIdParamRules,
  listAlertsQueryRules,
};

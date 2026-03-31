const { param } = require('express-validator');

const alertIdParamRules = [param('id').isUUID().withMessage('Invalid alert id')];

module.exports = {
  alertIdParamRules,
};

const Joi = require('@hapi/joi')

const fields = {
  label: Joi.string().min(3).max(15)
    .description('Label to apply to all pull requests')
}

const schema = Joi.object().keys({
  label: fields.label.optional(),
  branchLabels: Joi.object().pattern(/^/,
    Joi.string().required()
  ).optional(),
  pathLabels: Joi.object().pattern(/^/,
    Joi.array().items(Joi.string()).min(1).required()
  ).optional()
})

module.exports = schema

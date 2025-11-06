import Joi from 'joi';

// JOI schema for product
export const productSchema = Joi.object({
  name: Joi.string().min(1).required(),
  description: Joi.string().min(3).required(),
  price: Joi.number().required(),
  category: Joi.number().required(),
  subcategory: Joi.number().required(),
  is_active: Joi.boolean(),

  // new array of variants
  variants: Joi.array().items(
    Joi.object({
      colorId: Joi.number().required(),
      sizeId: Joi.number().required()
    })
  ).min(1).required(),

  quantity: Joi.number().optional(),
  image : Joi.string().allow(null).optional(),
  productId : Joi.number().allow(null).optional()
});


export const cadSchema = Joi.object({
  cardNo: Joi.number().required(),
  bags: Joi.number().required(),
  weigth: Joi.number().required(),
  ischecked: Joi.boolean().required(),
});


export const stackSchema = Joi.object({
  stackNo: Joi.number().required(),
  bags: Joi.number().required(),
  weigth: Joi.number().required()
});

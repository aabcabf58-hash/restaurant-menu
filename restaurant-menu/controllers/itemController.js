const pool = require("../config/db");

// إضافة صنف جديد
exports.addItem = async (req, res) => {
  try {
    const {
      category_id,
      name_ar,
      name_en,
      description_ar = null,
      description_en = null,
      price,
      currency = "USD",
      image_url = null,
      is_available = true,
      sort_order = 0,
    } = req.body;

    if (
      !category_id ||
      !name_ar ||
      !name_en ||
      price === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "category_id, name_ar, name_en and price are required",
      });
    }

    const numericCategoryId = Number(category_id);
    const numericPrice = Number(price);
    const numericSortOrder = Number(sort_order);
    const normalizedCurrency = String(currency)
      .trim()
      .toUpperCase();

    if (!Number.isInteger(numericCategoryId)) {
      return res.status(400).json({
        success: false,
        message: "category_id must be a valid integer",
      });
    }

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "price must be zero or greater",
      });
    }

    if (
      !Number.isInteger(numericSortOrder) ||
      numericSortOrder < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "sort_order must be a positive integer",
      });
    }

    if (!["USD", "LBP"].includes(normalizedCurrency)) {
      return res.status(400).json({
        success: false,
        message: "currency must be USD or LBP",
      });
    }

    if (typeof is_available !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_available must be true or false",
      });
    }

    const categoryResult = await pool.query(
      `
      SELECT id
      FROM categories
      WHERE id = $1
      LIMIT 1
      `,
      [numericCategoryId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO items (
        category_id,
        name_ar,
        name_en,
        description_ar,
        description_en,
        price,
        currency,
        image_url,
        is_available,
        sort_order
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10
      )
      RETURNING *
      `,
      [
        numericCategoryId,
        String(name_ar).trim(),
        String(name_en).trim(),
        description_ar
          ? String(description_ar).trim()
          : null,
        description_en
          ? String(description_en).trim()
          : null,
        numericPrice,
        normalizedCurrency,
        image_url
          ? String(image_url).trim()
          : null,
        is_available,
        numericSortOrder,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Item created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("addItem error:", error.message);

    if (error.code === "23503") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// جلب جميع الأصناف للمدير
exports.getAllItems = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        i.id,
        i.category_id,
        c.name_ar AS category_name_ar,
        c.name_en AS category_name_en,
        i.name_ar,
        i.name_en,
        i.description_ar,
        i.description_en,
        i.price,
        i.currency,
        i.image_url,
        i.is_available,
        i.is_active,
        i.sort_order,
        i.created_at,
        i.updated_at
      FROM items i
      INNER JOIN categories c
        ON c.id = i.category_id
      ORDER BY
        c.sort_order ASC,
        i.sort_order ASC,
        i.id ASC
      `
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "getAllItems error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// جلب الأصناف الظاهرة والمتوفرة للزبائن
exports.getAllActiveItems = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        i.id,
        i.category_id,
        i.name_ar,
        i.name_en,
        i.description_ar,
        i.description_en,
        i.price,
        i.currency,
        i.image_url,
        i.sort_order
      FROM items i
      INNER JOIN categories c
        ON c.id = i.category_id
      WHERE i.is_active = TRUE
        AND i.is_available = TRUE
        AND c.is_active = TRUE
      ORDER BY
        c.sort_order ASC,
        i.sort_order ASC,
        i.id ASC
      `
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "getAllActiveItems error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// تعديل بيانات صنف
exports.editItem = async (req, res) => {
  try {
    const {
      item_id,
      category_id,
      name_ar,
      name_en,
      description_ar,
      description_en,
      price,
      currency,
      image_url,
      is_available,
      sort_order,
    } = req.body;

    if (!item_id) {
      return res.status(400).json({
        success: false,
        message: "item_id is required",
      });
    }

    const existingResult = await pool.query(
      `
      SELECT *
      FROM items
      WHERE id = $1
      LIMIT 1
      `,
      [item_id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    if (
      category_id === undefined &&
      name_ar === undefined &&
      name_en === undefined &&
      description_ar === undefined &&
      description_en === undefined &&
      price === undefined &&
      currency === undefined &&
      image_url === undefined &&
      is_available === undefined &&
      sort_order === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "No fields were provided to update",
      });
    }

    if (
      name_ar !== undefined &&
      !String(name_ar).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "name_ar cannot be empty",
      });
    }

    if (
      name_en !== undefined &&
      !String(name_en).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "name_en cannot be empty",
      });
    }

    let numericCategoryId;

    if (category_id !== undefined) {
      numericCategoryId = Number(category_id);

      if (!Number.isInteger(numericCategoryId)) {
        return res.status(400).json({
          success: false,
          message:
            "category_id must be a valid integer",
        });
      }

      const categoryResult = await pool.query(
        `
        SELECT id
        FROM categories
        WHERE id = $1
        LIMIT 1
        `,
        [numericCategoryId]
      );

      if (categoryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    let numericPrice;

    if (price !== undefined) {
      numericPrice = Number(price);

      if (
        !Number.isFinite(numericPrice) ||
        numericPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "price must be zero or greater",
        });
      }
    }

    let normalizedCurrency;

    if (currency !== undefined) {
      normalizedCurrency = String(currency)
        .trim()
        .toUpperCase();

      if (
        !["USD", "LBP"].includes(normalizedCurrency)
      ) {
        return res.status(400).json({
          success: false,
          message: "currency must be USD or LBP",
        });
      }
    }

    if (
      is_available !== undefined &&
      typeof is_available !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "is_available must be true or false",
      });
    }

    let numericSortOrder;

    if (sort_order !== undefined) {
      numericSortOrder = Number(sort_order);

      if (
        !Number.isInteger(numericSortOrder) ||
        numericSortOrder < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "sort_order must be a positive integer",
        });
      }
    }

    const fields = [];
    const values = [];
    let parameterNumber = 1;

    const addField = (column, value) => {
      fields.push(`${column} = $${parameterNumber}`);
      values.push(value);
      parameterNumber++;
    };

    if (category_id !== undefined) {
      addField("category_id", numericCategoryId);
    }

    if (name_ar !== undefined) {
      addField("name_ar", String(name_ar).trim());
    }

    if (name_en !== undefined) {
      addField("name_en", String(name_en).trim());
    }

    if (description_ar !== undefined) {
      addField(
        "description_ar",
        description_ar
          ? String(description_ar).trim()
          : null
      );
    }

    if (description_en !== undefined) {
      addField(
        "description_en",
        description_en
          ? String(description_en).trim()
          : null
      );
    }

    if (price !== undefined) {
      addField("price", numericPrice);
    }

    if (currency !== undefined) {
      addField("currency", normalizedCurrency);
    }

    if (image_url !== undefined) {
      addField(
        "image_url",
        image_url
          ? String(image_url).trim()
          : null
      );
    }

    if (is_available !== undefined) {
      addField("is_available", is_available);
    }

    if (sort_order !== undefined) {
      addField("sort_order", numericSortOrder);
    }

    fields.push("updated_at = NOW()");
    values.push(item_id);

    const result = await pool.query(
      `
      UPDATE items
      SET ${fields.join(", ")}
      WHERE id = $${parameterNumber}
      RETURNING *
      `,
      values
    );

    return res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("editItem error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// إظهار أو إخفاء الصنف
exports.editActiveItem = async (req, res) => {
  try {
    const { item_id, is_active } = req.body;

    if (!item_id) {
      return res.status(400).json({
        success: false,
        message: "item_id is required",
      });
    }

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be true or false",
      });
    }

    const result = await pool.query(
      `
      UPDATE items
      SET
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [is_active, item_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: is_active
        ? "Item activated successfully"
        : "Item disabled successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "editActiveItem error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// حذف صنف نهائياً
exports.deleteItem = async (req, res) => {
  try {
    const { item_id } = req.params;

    if (!item_id) {
      return res.status(400).json({
        success: false,
        message: "item_id is required",
      });
    }

    const result = await pool.query(
      `
      DELETE FROM items
      WHERE id = $1
      RETURNING
        id,
        category_id,
        name_ar,
        name_en
      `,
      [item_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Item deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("deleteItem error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

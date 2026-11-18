const pool = require("../config/db");

// إضافة قسم
exports.addCategory = async (req, res) => {
  try {
    const {
      name_ar,
      name_en,
      image_url ,
      sort_order ,
    } = req.body;

    if (!name_ar || !name_en) {
      return res.status(400).json({
        success: false,
        message: "name_ar and name_en are required",
      });
    }

    const numericSortOrder = Number(sort_order);

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

    const result = await pool.query(
      `
      INSERT INTO categories (
        name_ar,
        name_en,
        image_url,
        sort_order
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        String(name_ar).trim(),
        String(name_en).trim(),
        image_url
          ? String(image_url).trim()
          : null,
        numericSortOrder,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "addCategory error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// جلب جميع الأقسام للإدارة
exports.getAllCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name_ar,
        name_en,
        image_url,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM categories
      ORDER BY sort_order ASC, id ASC
      `
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "getAllCategories error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// تعديل قسم
exports.editCategory = async (req, res) => {
  try {
    

    const {
        category_id,
      name_ar,
      name_en,
      image_url,
      sort_order,
    } = req.body;

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: "category_id is required",
      });
    }

    if (
      name_ar === undefined &&
      name_en === undefined &&
      image_url === undefined &&
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

    const result = await pool.query(
      `
      UPDATE categories
      SET
        name_ar = COALESCE($1, name_ar),
        name_en = COALESCE($2, name_en),
        image_url = CASE
          WHEN $3::boolean = TRUE THEN $4
          ELSE image_url
        END,
        sort_order = COALESCE($5, sort_order),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
      `,
      [
        name_ar !== undefined
          ? String(name_ar).trim()
          : null,

        name_en !== undefined
          ? String(name_en).trim()
          : null,

        image_url !== undefined,

        image_url
          ? String(image_url).trim()
          : null,

        numericSortOrder ?? null,

        category_id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "editCategory error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.editCategoryActive = async (req, res) => {
  try {
    
    const { category_id, is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be true or false",
      });
    }

    const result = await pool.query(
      `
      UPDATE categories
      SET
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [is_active, category_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: is_active
        ? "Category activated successfully"
        : "Category disabled successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "editCategoryActive error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getActiveCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name_ar,
        name_en,
        image_url,
        sort_order
      FROM categories
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, id ASC
      `
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "getActiveCategories error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.deleteCategory = async (req, res) => {
  const categoryId = Number(req.params.category_id);
  if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
    return res.status(400).json({ success: false, message: "رقم القسم غير صالح." });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const category = await client.query(
      "SELECT id FROM categories WHERE id = $1 FOR UPDATE",
      [categoryId]
    );

    if (category.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "القسم غير موجود." });
    }

    const deleted = await client.query(
      `
      DELETE FROM categories
      WHERE id = $1
        AND NOT EXISTS (SELECT 1 FROM items WHERE category_id = $1)
      RETURNING id
      `,
      [categoryId]
    );

    await client.query("COMMIT");

    if (deleted.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "القسم فيه منتجات. انقلها لقسم تاني أو احذفها أولاً.",
      });
    }

    return res.status(200).json({ success: true, data: deleted.rows[0] });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});

    if (error.code === "23503") {
      return res.status(409).json({ success: false, message: "القسم مرتبط ببيانات أخرى." });
    }

    console.error("deleteCategory error:", error.message);
    return res.status(500).json({ success: false, message: "تعذّر حذف القسم." });
  } finally {
    client?.release();
  }
};

import pool from '../config/database';

export interface SearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  shop_id?: number;
  status?: string;
  sortBy?: 'price' | 'name' | 'created_at' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class SearchService {
  // البحث في المنتجات
  static async searchProducts(filters: SearchFilters) {
    try {
      let whereClause = 'WHERE p.status = \'active\'';
      const params: any[] = [];
      let paramIndex = 1;

      // البحث النصي
      if (filters.query) {
        whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
        params.push(`%${filters.query}%`);
        paramIndex++;
      }

      // تصفية حسب التصنيف
      if (filters.category) {
        whereClause += ` AND p.category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      // تصفية حسب السعر
      if (filters.minPrice !== undefined) {
        whereClause += ` AND p.price >= $${paramIndex}`;
        params.push(filters.minPrice);
        paramIndex++;
      }

      if (filters.maxPrice !== undefined) {
        whereClause += ` AND p.price <= $${paramIndex}`;
        params.push(filters.maxPrice);
        paramIndex++;
      }

      // تصفية حسب المتجر
      if (filters.shop_id) {
        whereClause += ` AND p.shop_id = $${paramIndex}`;
        params.push(filters.shop_id);
        paramIndex++;
      }

      // الترتيب
      let orderClause = 'ORDER BY ';
      switch (filters.sortBy) {
        case 'price':
          orderClause += 'p.price';
          break;
        case 'name':
          orderClause += 'p.name';
          break;
        case 'popularity':
          orderClause += 'COALESCE(popularity_count, 0)';
          break;
        default:
          orderClause += 'p.created_at';
      }
      orderClause += ` ${filters.sortOrder || 'desc'}`;

      // الحد والانتقال
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      const query = `
        SELECT 
          p.*,
          s.name as shop_name,
          s.status as shop_status,
          u.full_name as owner_name,
          COALESCE(op_count.count, 0) as popularity_count
        FROM products p
        JOIN shops s ON p.shop_id = s.id
        JOIN users u ON s.owner_id = u.id
        LEFT JOIN (
          SELECT product_id, COUNT(*) as count
          FROM order_products
          GROUP BY product_id
        ) op_count ON p.id = op_count.product_id
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const result = await pool.query(query, params);
      
      // حساب العدد الإجمالي
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        JOIN shops s ON p.shop_id = s.id
        ${whereClause}
      `;
      
      const countResult = await pool.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        products: result.rows,
        pagination: {
          total,
          page: Math.floor(offset / limit) + 1,
          total_pages: Math.ceil(total / limit),
          limit,
          offset
        }
      };

    } catch (error) {
      console.error('Search products error:', error);
      throw error;
    }
  }

  // البحث في المتاجر
  static async searchShops(filters: SearchFilters) {
    try {
      let whereClause = 'WHERE s.status = \'approved\'';
      const params: any[] = [];
      let paramIndex = 1;

      // البحث النصي
      if (filters.query) {
        whereClause += ` AND (s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`;
        params.push(`%${filters.query}%`);
        paramIndex++;
      }

      // تصفية حسب التصنيف
      if (filters.category) {
        whereClause += ` AND s.category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      // الترتيب
      let orderClause = 'ORDER BY ';
      switch (filters.sortBy) {
        case 'name':
          orderClause += 's.name';
          break;
        case 'popularity':
          orderClause += 'COALESCE(product_count, 0)';
          break;
        default:
          orderClause += 's.created_at';
      }
      orderClause += ` ${filters.sortOrder || 'desc'}`;

      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      const query = `
        SELECT 
          s.*,
          u.full_name as owner_name,
          u.email as owner_email,
          COALESCE(p_count.count, 0) as product_count,
          COALESCE(o_count.count, 0) as order_count
        FROM shops s
        JOIN users u ON s.owner_id = u.id
        LEFT JOIN (
          SELECT shop_id, COUNT(*) as count
          FROM products
          GROUP BY shop_id
        ) p_count ON s.id = p_count.shop_id
        LEFT JOIN (
          SELECT shop_id, COUNT(*) as count
          FROM orders
          GROUP BY shop_id
        ) o_count ON s.id = o_count.shop_id
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const result = await pool.query(query, params);
      
      // حساب العدد الإجمالي
      const countQuery = `
        SELECT COUNT(*) as total
        FROM shops s
        ${whereClause}
      `;
      
      const countResult = await pool.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        shops: result.rows,
        pagination: {
          total,
          page: Math.floor(offset / limit) + 1,
          total_pages: Math.ceil(total / limit),
          limit,
          offset
        }
      };

    } catch (error) {
      console.error('Search shops error:', error);
      throw error;
    }
  }

  // الحصول على التصنيفات
  static async getCategories() {
    try {
      const result = await pool.query(`
        SELECT 
          category,
          COUNT(*) as product_count
        FROM products 
        WHERE status = 'active'
        GROUP BY category
        ORDER BY product_count DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Get categories error:', error);
      throw error;
    }
  }

  // الحصول على نطاقات الأسعار
  static async getPriceRanges() {
    try {
      const result = await pool.query(`
        SELECT 
          MIN(price) as min_price,
          MAX(price) as max_price,
          AVG(price) as avg_price
        FROM products 
        WHERE status = 'active'
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('Get price ranges error:', error);
      throw error;
    }
  }
}
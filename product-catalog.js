/**
 * LOMO'S MISCELLANEOUS - PRODUCT STRUCTURE MODULE
 * Multi-variant product management with correlative analytics support
 */

class ProductCatalog {
  constructor() {
    this.products = this.initializeProducts();
    this.storageKey = 'lomos_products_v2';
    this.load();
  }

  initializeProducts() {
    return [
      {
        id: 1,
        name: 'ActionWork',
        category: 'Service',
        variants: [
          { 
            sku: 'AW-50', 
            size: 'R50', 
            stock: 50, 
            price: 50.00, 
            costPrice: 30.00,
            soldCount: 0, 
            totalRevenue: 0,
            lastRestockDate: null 
          },
          { 
            sku: 'AW-30', 
            size: 'R30', 
            stock: 50, 
            price: 30.00, 
            costPrice: 30.00,
            soldCount: 0, 
            totalRevenue: 0,
            lastRestockDate: null 
          }
        ]
      },
      {
        id: 2,
        name: 'AbdulUpDown',
        category: 'Service',
        variants: [
          { 
            sku: 'AUD-30', 
            size: 'R30', 
            stock: 30, 
            price: 30.00, 
            costPrice: 15.00,
            soldCount: 0, 
            totalRevenue: 0,
            lastRestockDate: null 
          },
          { 
            sku: 'AUD-15', 
            size: 'R15', 
            stock: 30, 
            price: 15.00, 
            costPrice: 15.00,
            soldCount: 0, 
            totalRevenue: 0,
            lastRestockDate: null 
          }
        ]
      },
      {
        id: 3,
        name: 'Snoek',
        category: 'Product',
        variants: [
          { 
            sku: 'SNK-50', 
            size: 'R50', 
            stock: 100, 
            price: 50.00, 
            costPrice: 30.00,
            soldCount: 0, 
            totalRevenue: 0,
            lastRestockDate: null 
          },
          { 
            sku: 'SNK-30', 
            size: 'R30', 
            stock: 100, 
            price: 30.00, 
            costPrice: 30.00,
            soldCount: 0, 
            totalRevenue: 0,
            lastRestockDate: null 
          }
        ]
      }
    ];
  }

  load() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.products = JSON.parse(saved);
    }
    this.applyPriceFix();
  }

  /**
   * One-time correction for devices that already saved the old (wrong) prices.
   * Sets price + cost from the defaults, keeps stock and sales counts.
   */
  applyPriceFix() {
    const flag = 'lomos_price_fix_v1';
    if (localStorage.getItem(flag)) return;
    const defaults = this.initializeProducts();
    this.products.forEach(p => {
      p.variants.forEach(v => {
        defaults.forEach(dp => dp.variants.forEach(dv => {
          if (dv.sku === v.sku) { v.price = dv.price; v.costPrice = dv.costPrice; }
        }));
      });
    });
    this.save();
    localStorage.setItem(flag, '1');
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.products));
  }

  getProduct(productId) {
    return this.products.find(p => p.id === productId);
  }

  getVariant(productId, sku) {
    const product = this.getProduct(productId);
    return product ? product.variants.find(v => v.sku === sku) : null;
  }

  getAllVariants() {
    const allVariants = [];
    this.products.forEach(product => {
      product.variants.forEach(variant => {
        allVariants.push({
          product_id: product.id,        // FIXED: snake_case for pos_init
          product_name: product.name,    // FIXED: snake_case for pos_init
          unit_price: variant.price,     // FIXED: renamed from price to unit_price
          sku: variant.sku,
          stock: variant.stock,
          size: variant.size,
          costPrice: variant.costPrice,
          soldCount: variant.soldCount,
          totalRevenue: variant.totalRevenue,
          lastRestockDate: variant.lastRestockDate
        });
      });
    });
    return allVariants;
  }

  /**
   * Get all products (for POS dropdown)
   * Returns flat array of variants for easier iteration
   */
  getAll() {
    return this.getAllVariants();
  }

  /**
   * Get all products grouped by product name (for inventory)
   */
  getAllProducts() {
    return this.products;
  }

  /**
   * Get variant by SKU (required by POS module)
   * @param {string} sku - SKU to look up
   * @returns {object} Variant object with stock, price, etc.
   */
  getBySKU(sku) {
    for (let product of this.products) {
      const variant = product.variants.find(v => v.sku === sku);
      if (variant) {
        return {
          product_id: product.id,
          product_name: product.name,
          unit_price: variant.price,
          sku: variant.sku,
          stock: variant.stock,
          size: variant.size,
          costPrice: variant.costPrice,
          soldCount: variant.soldCount,
          totalRevenue: variant.totalRevenue,
          lastRestockDate: variant.lastRestockDate
        };
      }
    }
    return null;
  }

  recordSale(productId, sku, quantity, unitPrice) {
    const variant = this.getVariant(productId, sku);
    if (variant) {
      variant.stock = Math.max(0, variant.stock - quantity);
      variant.soldCount += quantity;
      variant.totalRevenue += (quantity * unitPrice);
      this.save();
      return true;
    }
    return false;
  }

  updateStock(productId, sku, newStock) {
    const variant = this.getVariant(productId, sku);
    if (variant) {
      variant.stock = parseInt(newStock) || 0;
      this.save();
      return true;
    }
    return false;
  }

  updatePrice(productId, sku, newPrice) {
    const variant = this.getVariant(productId, sku);
    if (variant) {
      variant.price = parseFloat(newPrice) || 0;
      this.save();
      return true;
    }
    return false;
  }

  updateCost(productId, sku, newCost) {
    const variant = this.getVariant(productId, sku);
    if (variant) {
      variant.costPrice = parseFloat(newCost) || 0;
      this.save();
      return true;
    }
    return false;
  }

  getVariantMetrics(productId, sku) {
    const variant = this.getVariant(productId, sku);
    if (!variant) return null;

    const margin = ((variant.price - variant.costPrice) / variant.price * 100).toFixed(1);
    const turnover = variant.soldCount > 0 ? (variant.totalRevenue / variant.soldCount).toFixed(2) : 0;

    return {
      sku,
      size: variant.size,
      stock: variant.stock,
      price: variant.price,
      costPrice: variant.costPrice,
      margin: `${margin}%`,
      soldCount: variant.soldCount,
      totalRevenue: variant.totalRevenue.toFixed(2),
      avgUnitPrice: turnover
    };
  }

  resetToDefaults() {
    this.products = this.initializeProducts();
    this.save();
  }

  clearStorage() {
    localStorage.removeItem(this.storageKey);
    this.products = this.initializeProducts();
  }
}

// Global instance
window.productCatalog = new ProductCatalog();

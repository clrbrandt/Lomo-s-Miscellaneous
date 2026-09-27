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
            price: 150.00, 
            costPrice: 100.00,
            soldCount: 0, 
            totalRevenue: 0,
            lastRestockDate: null 
          },
          { 
            sku: 'AW-30', 
            size: 'R30', 
            stock: 50, 
            price: 95.00, 
            costPrice: 60.00,
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
            price: 250.00, 
            costPrice: 150.00,
            soldCount: 0, 
            totalRevenue: 0,
            lastRestockDate: null 
          },
          { 
            sku: 'AUD-15', 
            size: 'R15', 
            stock: 30, 
            price: 125.00, 
            costPrice: 75.00,
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
            price: 85.00, 
            costPrice: 50.00,
            soldCount: 0, 
            totalRevenue: 0,
            lastRestockDate: null 
          },
          { 
            sku: 'SNK-30', 
            size: 'R30', 
            stock: 100, 
            price: 50.00, 
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
          productId: product.id,
          productName: product.name,
          ...variant
        });
      });
    });
    return allVariants;
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
}

// Global instance
window.productCatalog = new ProductCatalog();

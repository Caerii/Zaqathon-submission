import * as fs from 'fs';
import * as path from 'path';
import type { Product, ProductCategory, ProductAttributes } from '../../../shared/types/core';
import { logger } from '../utils/logger';
import { CacheService } from './cache-service';

interface ProductSearchResult {
  products: Product[];
  total: number;
  confidence_scores: number[];
}

interface ProductMatch {
  product: Product;
  confidence: number;
  match_type: 'exact_sku' | 'partial_sku' | 'name_match' | 'fuzzy_match';
  match_field: string;
}

export class ProductCatalogService {
  private products: Product[] = [];
  private categories: Map<string, ProductCategory> = new Map();
  private cache: CacheService;
  private loaded = false;

  constructor() {
    this.cache = new CacheService(600000); // 10 minute cache
  }

  /**
   * Load product catalog from CSV file
   */
  async loadCatalog(): Promise<void> {
    if (this.loaded) return;

    try {
      const csvPath = path.join(process.cwd(), '../data/Product Catalog.csv');
      
      if (!fs.existsSync(csvPath)) {
        throw new Error(`Product catalog not found at ${csvPath}`);
      }

      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n');

      // Parse CSV data (skip header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = this.parseCSVLine(line);
          if (values.length >= 6) {
            const product = this.parseProduct(values);
            this.products.push(product);
            
            // Track categories
            if (!this.categories.has(product.category.code)) {
              this.categories.set(product.category.code, product.category);
            }
          }
        } catch (error) {
          logger.warn(`Failed to parse product line ${i}`, { line, error });
        }
      }

      this.loaded = true;
      logger.info(`Loaded ${this.products.length} products from catalog`);
      
    } catch (error) {
      logger.error('Failed to load product catalog', { error });
      throw error;
    }
  }

  /**
   * Search products by SKU, name, or description
   */
  async searchProducts(query: string, limit: number = 20): Promise<ProductSearchResult> {
    await this.ensureLoaded();

    const matches = this.products
      .map(product => ({
        product,
        confidence: this.calculateMatchConfidence(product, query)
      }))
      .filter(match => match.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);

    return {
      products: matches.map(m => m.product),
      total: matches.length,
      confidence_scores: matches.map(m => m.confidence)
    };
  }

  /**
   * Find exact product by SKU
   */
  async findBySKU(sku: string): Promise<Product | null> {
    await this.ensureLoaded();
    return this.products.find(p => 
      p.product_code.toLowerCase() === sku.toLowerCase()
    ) || null;
  }

  /**
   * Get products by category
   */
  async getByCategory(categoryCode: string, limit: number = 50): Promise<Product[]> {
    await this.ensureLoaded();

    const cacheKey = `category:${categoryCode}:${limit}`;
    const cached = this.cache.get<Product[]>(cacheKey);
    if (cached) return cached;

    const products = this.products
      .filter(p => p.category.code === categoryCode)
      .slice(0, limit);

    this.cache.set(cacheKey, products);
    return products;
  }

  /**
   * Get product suggestions based on partial match
   */
  async getSuggestions(partialSku: string, limit: number = 10): Promise<Product[]> {
    await this.ensureLoaded();

    const suggestions = this.products
      .filter(p => 
        p.product_code.toLowerCase().includes(partialSku.toLowerCase()) ||
        p.product_name.toLowerCase().includes(partialSku.toLowerCase())
      )
      .sort((a, b) => {
        // Prioritize SKU matches over name matches
        const aSkuMatch = a.product_code.toLowerCase().includes(partialSku.toLowerCase());
        const bSkuMatch = b.product_code.toLowerCase().includes(partialSku.toLowerCase());
        
        if (aSkuMatch && !bSkuMatch) return -1;
        if (!aSkuMatch && bSkuMatch) return 1;
        
        // Then sort by name
        return a.product_name.localeCompare(b.product_name);
      })
      .slice(0, limit);

    return suggestions;
  }

  /**
   * Validate product availability and MOQ
   */
  async validateOrder(sku: string, quantity: number): Promise<{
    valid: boolean;
    product?: Product;
    issues: string[];
    suggestions: string[];
  }> {
    await this.ensureLoaded();

    const product = await this.findBySKU(sku);
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (!product) {
      issues.push(`Product SKU "${sku}" not found`);
      
      // Find similar products
      const similar = await this.getSuggestions(sku, 3);
      if (similar.length > 0) {
        suggestions.push(`Did you mean: ${similar.map(p => p.product_code).join(', ')}?`);
      }
      
      return { valid: false, issues, suggestions };
    }

    // Check stock availability
    if (product.available_in_stock === 0) {
      issues.push(`Product "${sku}" is out of stock`);
    } else if (quantity > product.available_in_stock) {
      issues.push(`Insufficient stock. Requested: ${quantity}, Available: ${product.available_in_stock}`);
      suggestions.push(`Consider reducing quantity to ${product.available_in_stock} or less`);
    }

    // Check MOQ
    if (quantity < product.min_order_quantity) {
      issues.push(`Quantity ${quantity} is below minimum order quantity of ${product.min_order_quantity}`);
      suggestions.push(`Increase quantity to at least ${product.min_order_quantity}`);
    }

    return {
      valid: issues.length === 0,
      product,
      issues,
      suggestions
    };
  }

  /**
   * Get all categories
   */
  getCategories(): ProductCategory[] {
    return Array.from(this.categories.values());
  }

  /**
   * Get all products (for AI context)
   */
  async getAllProducts(): Promise<Product[]> {
    await this.ensureLoaded();
    return [...this.products]; // Return a copy
  }

  /**
   * Get catalog statistics
   */
  getStats() {
    return {
      total_products: this.products.length,
      categories: this.categories.size,
      out_of_stock: this.products.filter(p => p.available_in_stock === 0).length,
      low_stock: this.products.filter(p => p.available_in_stock > 0 && p.available_in_stock < 10).length,
      avg_price: this.products.reduce((sum, p) => sum + p.price, 0) / this.products.length,
      cache_stats: this.cache.getStats()
    };
  }

  // Private helper methods

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.loadCatalog();
    }
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  private parseProduct(values: string[]): Product {
    const [code, name, priceStr, stockStr, moqStr, description] = values;
    
    // Extract category from product code (e.g., "DSK-0001" -> "DSK")
    const categoryCode = code.split('-')[0];
    const categoryName = this.getCategoryName(categoryCode);

    return {
      product_code: code,
      product_name: name,
      price: parseFloat(priceStr) || 0,
      available_in_stock: parseInt(stockStr) || 0,
      min_order_quantity: parseInt(moqStr) || 1,
      description: description.replace(/^"/, '').replace(/"$/, ''), // Remove quotes
      category: {
        code: categoryCode,
        name: categoryName
      },
      attributes: {
        tags: this.extractTags(name, description)
      }
    };
  }

  private getCategoryName(code: string): string {
    const categoryMap: Record<string, string> = {
      'DSK': 'Desks',
      'CHR': 'Chairs', 
      'DTB': 'Dining Tables',
      'DCH': 'Dining Chairs',
      'BSF': 'Bookshelves',
      'SFA': 'Sofas',
      'CFT': 'Coffee Tables',
      'TVS': 'TV Stands'
    };
    
    return categoryMap[code] || 'Unknown';
  }

  private extractTags(name: string, description: string): string[] {
    const tags: string[] = [];
    const text = `${name} ${description}`.toLowerCase();
    
    // Extract style keywords
    const styleKeywords = ['modern', 'classic', 'contemporary', 'vintage', 'minimalist'];
    const materialKeywords = ['wood', 'metal', 'glass', 'fabric', 'leather'];
    const colorKeywords = ['black', 'white', 'brown', 'gray', 'blue', 'red'];
    
    [...styleKeywords, ...materialKeywords, ...colorKeywords].forEach(keyword => {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    return tags;
  }

  private calculateMatchConfidence(product: Product, query: string): number {
    const queryLower = query.toLowerCase();
    let confidence = 0;

    // Exact SKU match
    if (product.product_code.toLowerCase() === queryLower) {
      confidence = 1.0;
    }
    // Partial SKU match
    else if (product.product_code.toLowerCase().includes(queryLower)) {
      confidence = 0.8;
    }
    // Product name match
    else if (product.product_name.toLowerCase().includes(queryLower)) {
      confidence = 0.6;
    }
    // Description match
    else if (product.description.toLowerCase().includes(queryLower)) {
      confidence = 0.4;
    }

    return confidence;
  }
} 
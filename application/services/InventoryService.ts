import { 
  IInventoryRepository, 
  StockMovementType, 
  InventorySummary,
  RecordTransactionDto,
  PaginatedInventoryItems
} from '../../domain/interfaces/repositories/IInventoryRepository';
import { InventoryCategory } from '../../domain/enums/InventoryCategory';
import { ValidationError } from '../errors/ValidationError';

export class InventoryService {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  /**
   * Search and paginate inventory items with optional filtering
   */
  async searchAndPaginateItems(options: {
    search?: string;
    category?: InventoryCategory | string;
    page: number;
    limit: number;
    isBillable?: boolean;
  }): Promise<PaginatedInventoryItems> {
    // Validate pagination parameters
    if (options.page < 1) {
      throw new ValidationError('Page must be at least 1', [
        { field: 'page', message: 'Must be >= 1' }
      ]);
    }

    if (options.limit < 1 || options.limit > 200) {
      throw new ValidationError('Limit must be between 1 and 200', [
        { field: 'limit', message: 'Must be between 1 and 200' }
      ]);
    }

    // Convert string category to enum if needed
    let category: InventoryCategory | undefined;
    if (options.category && typeof options.category === 'string' && options.category.trim()) {
      // Validate it's a valid category
      const validCategories = Object.values(InventoryCategory);
      if (!validCategories.includes(options.category as InventoryCategory)) {
        throw new ValidationError('Invalid category', [
          { field: 'category', message: `Must be one of: ${validCategories.join(', ')}` }
        ]);
      }
      category = options.category as InventoryCategory;
    }

    return this.inventoryRepository.searchAndPaginateItems({
      search: options.search,
      category,
      page: options.page,
      limit: options.limit,
      isBillable: options.isBillable,
    });
  }

  /**
   * Get current balance for an inventory item
   */
  async getItemBalance(itemId: number): Promise<number> {
    return this.inventoryRepository.getItemBalance(itemId);
  }

  /**
   * Record a stock in movement (Receive Goods / Manual Add)
   */
  async recordStockIn(dto: Omit<RecordTransactionDto, 'type'>) {
    if (dto.quantity <= 0) {
      throw new ValidationError('Stock in quantity must be greater than zero', [{
        field: 'quantity',
        message: 'Must be positive'
      }]);
    }

    return this.inventoryRepository.recordTransaction({
      ...dto,
      type: StockMovementType.STOCK_IN
    });
  }

  /**
   * Record a stock out movement (Consumption / Disposal)
   * Validates if enough stock exists.
   */
  async recordStockOut(dto: Omit<RecordTransactionDto, 'type'>) {
    if (dto.quantity <= 0) {
      throw new ValidationError('Stock out quantity must be greater than zero', [{
        field: 'quantity',
        message: 'Must be positive'
      }]);
    }

    const currentBalance = await this.inventoryRepository.getItemBalance(dto.inventoryItemId);
    if (currentBalance < dto.quantity) {
      throw new ValidationError(`Insufficient stock. Available: ${currentBalance}, Requested: ${dto.quantity}`, [{
        field: 'quantity',
        message: 'Insufficient stock'
      }]);
    }

    return this.inventoryRepository.recordTransaction({
      ...dto,
      type: StockMovementType.STOCK_OUT
    });
  }

  /**
   * Record a manual adjustment
   */
  async recordAdjustment(dto: Omit<RecordTransactionDto, 'type'>) {
    // Adjustments can be positive or negative
    return this.inventoryRepository.recordTransaction({
      ...dto,
      type: StockMovementType.ADJUSTMENT
    });
  }

  /**
   * Set the opening balance for an item
   * Typically used during system initialization or after a major audit.
   */
  async setOpeningBalance(dto: Omit<RecordTransactionDto, 'type'>) {
    return this.inventoryRepository.recordTransaction({
      ...dto,
      type: StockMovementType.OPENING_BALANCE
    });
  }

  /**
   * Get the full inventory dashboard summary
   */
  async getDashboardSummary(): Promise<InventorySummary[]> {
    return this.inventoryRepository.getInventorySummary();
  }

  /**
   * Get transaction history for a specific item
   */
  async getItemHistory(itemId: number) {
    return this.inventoryRepository.findTransactionsByItem(itemId);
  }
}

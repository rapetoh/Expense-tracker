# Future Income Tracking Features

This document outlines additional income tracking features to consider for future implementation.

## Additional Features to Consider

### 1. Recurring Income Details
- **Start Date**: When recurring income begins
- **End Date**: When recurring income ends (if known)
- **Use Case**: Better forecasting of future income streams

### 2. Payment Status Tracking
- **Status Options**: Pending, Received, Overdue
- **Use Case**: Useful for freelancers/contractors tracking invoices and payments
- **Implementation**: Add `payment_status` field (enum: pending, received, overdue)

### 3. Expected vs Actual Income
- **Expected Amount**: Planned income amount
- **Actual Amount**: Received amount
- **Use Case**: Variance analysis, budget planning
- **Implementation**: Add `expected_amount_cents` field

### 4. Tax Categorization
- **Tax Types**: W-2, 1099, Capital Gains, etc.
- **Use Case**: Tax preparation and reporting
- **Implementation**: Add `tax_category` field (enum or reference table)

### 5. Income Goals/Targets
- **Monthly/Annual Income Goals**: Set income targets
- **Progress Tracking**: Track progress toward goals
- **Implementation**: Separate goals table/API

### 6. Attachments/Documentation
- **Document Storage**: Attach pay stubs, invoices, receipts
- **Use Case**: Tax records, verification, loan applications
- **Implementation**: File upload API + storage integration

## Notes
- These features are documented for future consideration
- Prioritize based on user feedback and usage patterns
- Some features may require significant infrastructure changes (e.g., file storage)


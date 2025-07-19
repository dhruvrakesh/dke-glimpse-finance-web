
export const sampleSchedule3Items = [
  // Balance Sheet - Assets
  {
    schedule3_item: "Property, Plant and Equipment",
    report_section: "Non-Current Assets",
    report_sub_section: null,
    report_type: "BalanceSheet",
    is_credit_positive: false,
    display_order: 101
  },
  {
    schedule3_item: "Investment Property",
    report_section: "Non-Current Assets", 
    report_sub_section: null,
    report_type: "BalanceSheet",
    is_credit_positive: false,
    display_order: 102
  },
  {
    schedule3_item: "Intangible Assets",
    report_section: "Non-Current Assets",
    report_sub_section: null,
    report_type: "BalanceSheet", 
    is_credit_positive: false,
    display_order: 103
  },
  {
    schedule3_item: "Investments",
    report_section: "Non-Current Assets",
    report_sub_section: "Financial Assets",
    report_type: "BalanceSheet",
    is_credit_positive: false,
    display_order: 104
  },
  {
    schedule3_item: "Trade Receivables",
    report_section: "Current Assets",
    report_sub_section: "Financial Assets",
    report_type: "BalanceSheet",
    is_credit_positive: false,
    display_order: 201
  },
  {
    schedule3_item: "Cash and Cash Equivalents",
    report_section: "Current Assets",
    report_sub_section: "Financial Assets", 
    report_type: "BalanceSheet",
    is_credit_positive: false,
    display_order: 202
  },
  {
    schedule3_item: "Bank Balance other than Cash and Cash Equivalents",
    report_section: "Current Assets",
    report_sub_section: "Financial Assets",
    report_type: "BalanceSheet",
    is_credit_positive: false,
    display_order: 203
  },
  {
    schedule3_item: "Inventories",
    report_section: "Current Assets",
    report_sub_section: null,
    report_type: "BalanceSheet",
    is_credit_positive: false,
    display_order: 204
  },
  {
    schedule3_item: "Other Current Assets",
    report_section: "Current Assets", 
    report_sub_section: null,
    report_type: "BalanceSheet",
    is_credit_positive: false,
    display_order: 205
  },

  // Balance Sheet - Equity & Liabilities
  {
    schedule3_item: "Equity Share Capital",
    report_section: "Equity",
    report_sub_section: null,
    report_type: "BalanceSheet",
    is_credit_positive: true,
    display_order: 301
  },
  {
    schedule3_item: "Other Equity",
    report_section: "Equity",
    report_sub_section: null,
    report_type: "BalanceSheet", 
    is_credit_positive: true,
    display_order: 302
  },
  {
    schedule3_item: "Borrowings",
    report_section: "Non-Current Liabilities",
    report_sub_section: "Financial Liabilities",
    report_type: "BalanceSheet",
    is_credit_positive: true,
    display_order: 401
  },
  {
    schedule3_item: "Provisions",
    report_section: "Non-Current Liabilities",
    report_sub_section: null,
    report_type: "BalanceSheet",
    is_credit_positive: true,
    display_order: 402
  },
  {
    schedule3_item: "Deferred Tax Liabilities",
    report_section: "Non-Current Liabilities",
    report_sub_section: null,
    report_type: "BalanceSheet",
    is_credit_positive: true,
    display_order: 403
  },
  {
    schedule3_item: "Borrowings",
    report_section: "Current Liabilities",
    report_sub_section: "Financial Liabilities",
    report_type: "BalanceSheet",
    is_credit_positive: true,
    display_order: 501
  },
  {
    schedule3_item: "Trade Payables",
    report_section: "Current Liabilities",
    report_sub_section: "Financial Liabilities",
    report_type: "BalanceSheet",
    is_credit_positive: true,
    display_order: 502
  },
  {
    schedule3_item: "Other Current Liabilities",
    report_section: "Current Liabilities",
    report_sub_section: null,
    report_type: "BalanceSheet",
    is_credit_positive: true,
    display_order: 503
  },
  {
    schedule3_item: "Short-term Provisions",
    report_section: "Current Liabilities",
    report_sub_section: null,
    report_type: "BalanceSheet",
    is_credit_positive: true,
    display_order: 504
  },

  // Profit & Loss
  {
    schedule3_item: "Revenue from Operations",
    report_section: "Revenue",
    report_sub_section: null,
    report_type: "ProfitAndLoss",
    is_credit_positive: true,
    display_order: 601
  },
  {
    schedule3_item: "Other Income",
    report_section: "Revenue", 
    report_sub_section: null,
    report_type: "ProfitAndLoss",
    is_credit_positive: true,
    display_order: 602
  },
  {
    schedule3_item: "Cost of Materials Consumed",
    report_section: "Expenses",
    report_sub_section: null,
    report_type: "ProfitAndLoss",
    is_credit_positive: false,
    display_order: 701
  },
  {
    schedule3_item: "Purchase of Stock-in-Trade",
    report_section: "Expenses",
    report_sub_section: null,
    report_type: "ProfitAndLoss",
    is_credit_positive: false,
    display_order: 702
  },
  {
    schedule3_item: "Changes in Inventories",
    report_section: "Expenses",
    report_sub_section: null,
    report_type: "ProfitAndLoss",
    is_credit_positive: false,
    display_order: 703
  },
  {
    schedule3_item: "Employee Benefits Expense",
    report_section: "Expenses",
    report_sub_section: null,
    report_type: "ProfitAndLoss",
    is_credit_positive: false,
    display_order: 704
  },
  {
    schedule3_item: "Finance Costs",
    report_section: "Expenses",
    report_sub_section: null,
    report_type: "ProfitAndLoss",
    is_credit_positive: false,
    display_order: 705
  },
  {
    schedule3_item: "Depreciation and Amortisation Expense",
    report_section: "Expenses",
    report_sub_section: null,
    report_type: "ProfitAndLoss",
    is_credit_positive: false,
    display_order: 706
  },
  {
    schedule3_item: "Other Expenses",
    report_section: "Expenses",
    report_sub_section: null,
    report_type: "ProfitAndLoss",
    is_credit_positive: false,
    display_order: 707
  }
];

// Enhanced sample trial balance data with more realistic DKEGL accounts
export const sampleTrialBalanceData = [
  // Fixed Assets
  { ledger_name: "Building", closing_balance: 15000000 },
  { ledger_name: "Plant & Machinery", closing_balance: 8500000 },
  { ledger_name: "Office Equipment", closing_balance: 750000 },
  { ledger_name: "Furniture & Fixtures", closing_balance: 500000 },
  { ledger_name: "Vehicles", closing_balance: 1200000 },
  { ledger_name: "Computer & Software", closing_balance: 350000 },
  
  // Current Assets
  { ledger_name: "Sundry Debtors", closing_balance: 2400000 },
  { ledger_name: "Trade Receivables - Domestic", closing_balance: 1800000 },
  { ledger_name: "Trade Receivables - Export", closing_balance: 950000 },
  { ledger_name: "Cash in Hand", closing_balance: 85000 },
  { ledger_name: "Bank Current Account - SBI", closing_balance: 1250000 },
  { ledger_name: "Bank Current Account - HDFC", closing_balance: 750000 },
  { ledger_name: "Bank Fixed Deposit", closing_balance: 2000000 },
  { ledger_name: "Raw Materials", closing_balance: 1500000 },
  { ledger_name: "Work in Progress", closing_balance: 650000 },
  { ledger_name: "Finished Goods", closing_balance: 2200000 },
  { ledger_name: "Packing Materials", closing_balance: 180000 },
  { ledger_name: "Stores & Spares", closing_balance: 320000 },
  { ledger_name: "Prepaid Expenses", closing_balance: 125000 },
  { ledger_name: "Advance to Suppliers", closing_balance: 450000 },
  
  // Liabilities
  { ledger_name: "Share Capital", closing_balance: -10000000 },
  { ledger_name: "Retained Earnings", closing_balance: -8500000 },
  { ledger_name: "General Reserve", closing_balance: -2500000 },
  { ledger_name: "Term Loan - Bank", closing_balance: -5000000 },
  { ledger_name: "Working Capital Loan", closing_balance: -2000000 },
  { ledger_name: "Sundry Creditors", closing_balance: -1650000 },
  { ledger_name: "Trade Payables - Raw Material", closing_balance: -950000 },
  { ledger_name: "Trade Payables - Services", closing_balance: -380000 },
  { ledger_name: "Outstanding Expenses", closing_balance: -420000 },
  { ledger_name: "Salary Payable", closing_balance: -180000 },
  { ledger_name: "TDS Payable", closing_balance: -85000 },
  { ledger_name: "GST Payable", closing_balance: -220000 },
  { ledger_name: "Professional Tax Payable", closing_balance: -15000 },
  
  // Income
  { ledger_name: "Sales - Domestic", closing_balance: -18500000 },
  { ledger_name: "Sales - Export", closing_balance: -8200000 },
  { ledger_name: "Service Income", closing_balance: -750000 },
  { ledger_name: "Interest Income", closing_balance: -150000 },
  { ledger_name: "Other Income", closing_balance: -95000 },
  { ledger_name: "Foreign Exchange Gain", closing_balance: -45000 },
  
  // Expenses
  { ledger_name: "Raw Material Consumption", closing_balance: 9500000 },
  { ledger_name: "Direct Labor", closing_balance: 2800000 },
  { ledger_name: "Factory Overhead", closing_balance: 1200000 },
  { ledger_name: "Salary & Wages", closing_balance: 3200000 },
  { ledger_name: "Rent", closing_balance: 720000 },
  { ledger_name: "Electricity", closing_balance: 480000 },
  { ledger_name: "Telephone & Internet", closing_balance: 85000 },
  { ledger_name: "Repairs & Maintenance", closing_balance: 350000 },
  { ledger_name: "Insurance", closing_balance: 125000 },
  { ledger_name: "Professional Fees", closing_balance: 180000 },
  { ledger_name: "Audit Fees", closing_balance: 45000 },
  { ledger_name: "Bank Charges", closing_balance: 25000 },
  { ledger_name: "Interest on Loan", closing_balance: 380000 },
  { ledger_name: "Depreciation", closing_balance: 650000 },
  { ledger_name: "Transportation", closing_balance: 220000 },
  { ledger_name: "Packaging Expenses", closing_balance: 150000 },
  { ledger_name: "Advertisement", closing_balance: 95000 },
  { ledger_name: "Office Expenses", closing_balance: 125000 },
  { ledger_name: "Travelling Expenses", closing_balance: 180000 },
  { ledger_name: "Foreign Exchange Loss", closing_balance: 35000 }
];

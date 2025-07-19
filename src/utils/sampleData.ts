
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

export const sampleTrialBalanceData = [
  { ledger_name: "Building", closing_balance: 5000000 },
  { ledger_name: "Plant & Machinery", closing_balance: 3000000 },
  { ledger_name: "Furniture & Fixtures", closing_balance: 500000 },
  { ledger_name: "Sundry Debtors", closing_balance: 1200000 },
  { ledger_name: "Cash in Hand", closing_balance: 50000 },
  { ledger_name: "Bank Current Account", closing_balance: 800000 },
  { ledger_name: "Raw Materials", closing_balance: 600000 },
  { ledger_name: "Finished Goods", closing_balance: 400000 },
  { ledger_name: "Share Capital", closing_balance: -5000000 },
  { ledger_name: "Retained Earnings", closing_balance: -2000000 },
  { ledger_name: "Bank Loan", closing_balance: -1500000 },
  { ledger_name: "Sundry Creditors", closing_balance: -800000 },
  { ledger_name: "Sales", closing_balance: -12000000 },
  { ledger_name: "Purchase", closing_balance: 7000000 },
  { ledger_name: "Salary & Wages", closing_balance: 2000000 },
  { ledger_name: "Rent", closing_balance: 600000 },
  { ledger_name: "Electricity", closing_balance: 300000 },
  { ledger_name: "Depreciation", closing_balance: 250000 }
];


// CSV template data and generation utilities

export const trialBalanceTemplate = [
  { ledger_name: "Cash in Hand", closing_balance: 85000 },
  { ledger_name: "Bank Current Account - SBI", closing_balance: 1250000 },
  { ledger_name: "Sundry Debtors", closing_balance: 2400000 },
  { ledger_name: "Raw Materials", closing_balance: 1500000 },
  { ledger_name: "Finished Goods", closing_balance: 2200000 },
  { ledger_name: "Share Capital", closing_balance: -10000000 },
  { ledger_name: "Retained Earnings", closing_balance: -8500000 },
  { ledger_name: "Trade Payables - Raw Material", closing_balance: -950000 },
  { ledger_name: "Sales - Domestic", closing_balance: -18500000 },
  { ledger_name: "Raw Material Consumption", closing_balance: 9500000 },
  { ledger_name: "Salary & Wages", closing_balance: 3200000 },
  { ledger_name: "Rent", closing_balance: 720000 },
  { ledger_name: "Electricity", closing_balance: 480000 },
  { ledger_name: "Depreciation", closing_balance: 650000 }
];

export const attendanceTemplate = [
  { employee_code: "EMP-001-0001", date: "2024-01-15", hours_worked: 8, overtime_hours: 0, status: "PRESENT" },
  { employee_code: "EMP-001-0002", date: "2024-01-15", hours_worked: 8, overtime_hours: 2, status: "PRESENT" },
  { employee_code: "EMP-001-0003", date: "2024-01-15", hours_worked: 0, overtime_hours: 0, status: "CASUAL_LEAVE" },
  { employee_code: "EMP-001-0004", date: "2024-01-15", hours_worked: 6, overtime_hours: 0, status: "PRESENT" },
  { employee_code: "EMP-001-0005", date: "2024-01-15", hours_worked: 0, overtime_hours: 0, status: "WEEKLY_OFF" }
];

export const leaveBalanceTemplate = [
  { employee_code: "EMP-001-0001", year: 2024, casual_leave_balance: 12, earned_leave_balance: 21 },
  { employee_code: "EMP-001-0002", year: 2024, casual_leave_balance: 10, earned_leave_balance: 18 },
  { employee_code: "EMP-001-0003", year: 2024, casual_leave_balance: 8, earned_leave_balance: 15 },
  { employee_code: "EMP-001-0004", year: 2024, casual_leave_balance: 12, earned_leave_balance: 21 },
  { employee_code: "EMP-001-0005", year: 2024, casual_leave_balance: 11, earned_leave_balance: 20 }
];

// Convert array of objects to CSV string
export const arrayToCSV = (data: Record<string, any>[]): string => {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
};

// Download CSV file
export const downloadCSV = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// Template download functions
export const downloadTrialBalanceTemplate = (): void => {
  const csvContent = arrayToCSV(trialBalanceTemplate);
  downloadCSV(csvContent, 'trial_balance_template.csv');
};

export const downloadAttendanceTemplate = (): void => {
  const csvContent = arrayToCSV(attendanceTemplate);
  downloadCSV(csvContent, 'attendance_template.csv');
};

export const downloadLeaveBalanceTemplate = (): void => {
  const csvContent = arrayToCSV(leaveBalanceTemplate);
  downloadCSV(csvContent, 'leave_balance_template.csv');
};

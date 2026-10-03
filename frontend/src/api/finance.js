/* Salaries, expenses and profit (backend: FinanceController, App\Support\Finance). */
import { api } from "./client";

const q = (month) => (month ? `?month=${month}` : "");
export const getFinanceSummary = (month) => api.get(`/owner/finance/summary${q(month)}`);
export const getEmployees = () => api.get("/owner/finance/employees");
export const addEmployee = (data) => api.post("/owner/finance/employees", data);
export const updateEmployee = (id, data) => api.patch(`/owner/finance/employees/${id}`, data);
export const removeEmployee = (id) => api.delete(`/owner/finance/employees/${id}`);
export const getExpenses = (month) => api.get(`/owner/finance/expenses${q(month)}`);
export const addExpense = (data) => api.post("/owner/finance/expenses", data);
export const removeExpense = (id) => api.delete(`/owner/finance/expenses/${id}`);
export const getPayroll = (month) => api.get(`/owner/finance/payroll${q(month)}`);
export const getAttendance = (date) => api.get(`/owner/finance/attendance?date=${date}`);
export const markAttendance = (date, marks) => api.put("/owner/finance/attendance", { date, marks });

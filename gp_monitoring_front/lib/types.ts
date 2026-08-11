export interface User {
  id: number;
  username: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  accessToken: string;
}

export interface DailyGpAnalysis {
  count: number;
  date: string | null;
  branch: string;
  sales: number;
  profit: number;
  gp: number;
  mainServerDatabaseName: string;
}

export interface MonthlyGpAnalysis {
  count: number;
  month: string | null;
  branch: string;
  sales: number;
  profit: number;
  gp: number;
  mainServerDatabaseName: string;
}

export interface Branch {
  id: string;
  branchCode: string;
  branchName: string;
  branchLocation: string;
  mainServerDatabaseName: string;
}

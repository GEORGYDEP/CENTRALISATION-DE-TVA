export interface AccountRow {
  id: string; // Unique ID for list rendering
  code: string;
  name: string;
  debit: number;
  credit: number;
  isVat: boolean; // Hidden flag for validation logic
}

export interface Scenario {
  id: number;
  name: string;
  description: string;
  rows: AccountRow[];
}

export interface JournalEntry {
  id: string;
  code: string;
  name: string;
  debit: number;
  credit: number;
  isManual: boolean; // True if added by user (centralizers), false if transferred
  originalSide?: 'debit' | 'credit'; // To track if student reversed it
}

export type FeedbackType = 'success' | 'error' | 'neutral';

export interface Feedback {
  type: FeedbackType;
  message: string;
  details?: string[];
}

// Enum for centralizer accounts
export enum CentralizerAccount {
  Recoverable = '4119',
  Payable = '4519'
}

export interface ScenarioResult {
  scenarioName: string;
  scenarioRows: AccountRow[];
  studentEntries: JournalEntry[];
  isBalanced: boolean;
  totals: { debit: number; credit: number };
}
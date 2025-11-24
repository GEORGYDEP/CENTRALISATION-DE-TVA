export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
};

export const parseAmount = (input: string): number => {
  // Replace comma with dot and remove non-numeric chars except dot
  const cleanInput = input.replace(',', '.').replace(/[^0-9.]/g, '');
  return parseFloat(cleanInput) || 0;
};

// Helper to generate unique IDs
export const generateId = (): string => Math.random().toString(36).substr(2, 9);

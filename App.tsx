import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCcw, 
  Plus, 
  Trash2, 
  ArrowRight,
  Calculator,
  BookOpen,
  School,
  User,
  Printer,
  PartyPopper
} from 'lucide-react';
import { AccountRow, JournalEntry, Feedback, CentralizerAccount, ScenarioResult } from './types';
import { scenarios, MANUAL_ACCOUNTS } from './data';
import { formatCurrency, generateId, parseAmount } from './utils';

type AppState = 'login' | 'game' | 'summary';

export default function App() {
  // --- Global State ---
  const [appState, setAppState] = useState<AppState>('login');
  const [studentEmail, setStudentEmail] = useState<string>('');
  const [completedResults, setCompletedResults] = useState<ScenarioResult[]>([]);

  // --- Game State ---
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState<number>(0);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [manualAmount, setManualAmount] = useState<string>("");
  const [selectedManualAccount, setSelectedManualAccount] = useState<string>(MANUAL_ACCOUNTS[0].code);
  const [isScenarioValidated, setIsScenarioValidated] = useState<boolean>(false);

  // --- Derived State ---
  const currentScenario = useMemo(() => scenarios[currentScenarioIndex], [currentScenarioIndex]);
  const isLastScenario = currentScenarioIndex === scenarios.length - 1;

  const journalTotals = useMemo(() => {
    const debit = journalEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const credit = journalEntries.reduce((sum, entry) => sum + entry.credit, 0);
    const diff = Math.abs(debit - credit);
    const isBalanced = diff < 0.01;
    return { debit, credit, diff, isBalanced };
  }, [journalEntries]);

  // --- Login Handlers ---
  const handleLogin = (email: string) => {
    // Regex: prenom.nom@istlm.org (case insensitive)
    const regex = /^[a-zA-Z0-9.-]+@istlm\.org$/i;
    if (regex.test(email)) {
      setStudentEmail(email.toLowerCase());
      setAppState('game');
    } else {
      alert("L'adresse email doit être au format prenom.nom@istlm.org");
    }
  };

  // --- Game Handlers ---

  const resetScenarioState = () => {
    setSelectedAccountIds(new Set());
    setJournalEntries([]);
    setFeedback(null);
    setManualAmount("");
    setIsScenarioValidated(false);
  };

  const goToNextScenario = () => {
    // Save result
    const result: ScenarioResult = {
      scenarioName: currentScenario.name,
      scenarioRows: currentScenario.rows,
      studentEntries: [...journalEntries],
      isBalanced: journalTotals.isBalanced,
      totals: { debit: journalTotals.debit, credit: journalTotals.credit }
    };
    
    const newResults = [...completedResults, result];
    setCompletedResults(newResults);

    if (isLastScenario) {
      setAppState('summary');
    } else {
      setCurrentScenarioIndex(prev => prev + 1);
      resetScenarioState();
    }
  };

  const restartGame = () => {
    setCompletedResults([]);
    setCurrentScenarioIndex(0);
    resetScenarioState();
    setAppState('login');
    setStudentEmail('');
  };

  const toggleAccountSelection = (id: string) => {
    if (isScenarioValidated) return;
    const newSet = new Set(selectedAccountIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedAccountIds(newSet);
  };

  const transferToJournal = () => {
    if (isScenarioValidated) return;
    const newEntries: JournalEntry[] = [];
    
    // Find selected rows
    const selectedRows = currentScenario.rows.filter(row => selectedAccountIds.has(row.id));
    
    // Filter out rows already in journal
    const existingCodes = new Set(journalEntries.map(e => e.code));
    
    selectedRows.forEach(row => {
      if (!existingCodes.has(row.code)) {
        newEntries.push({
          id: generateId(),
          code: row.code,
          name: row.name,
          debit: row.debit,
          credit: row.credit,
          isManual: false,
          originalSide: row.debit > 0 ? 'debit' : 'credit'
        });
      }
    });

    if (newEntries.length === 0) {
      setFeedback({
        type: 'neutral',
        message: "Aucun nouveau compte sélectionné ou les comptes sont déjà dans le JOD."
      });
      return;
    }

    setJournalEntries([...journalEntries, ...newEntries]);
    setFeedback(null);
  };

  const toggleEntrySide = (entryId: string) => {
    if (isScenarioValidated) return;
    setJournalEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;
      return {
        ...entry,
        debit: entry.credit,
        credit: entry.debit
      };
    }));
    setFeedback(null);
  };

  const addManualEntry = () => {
    if (isScenarioValidated) return;
    const amount = parseAmount(manualAmount);
    if (amount <= 0) return;

    const accountInfo = MANUAL_ACCOUNTS.find(a => a.code === selectedManualAccount);
    if (!accountInfo) return;

    const isPayable = accountInfo.code === '4519';
    
    const newEntry: JournalEntry = {
      id: generateId(),
      code: accountInfo.code,
      name: accountInfo.name,
      debit: isPayable ? 0 : amount,
      credit: isPayable ? amount : 0,
      isManual: true
    };

    setJournalEntries([...journalEntries, newEntry]);
    setManualAmount("");
    setFeedback(null);
  };

  const removeEntry = (id: string) => {
    if (isScenarioValidated) return;
    setJournalEntries(prev => prev.filter(e => e.id !== id));
    setFeedback(null);
  };

  // --- Verification Logic ---
  const verifyEntry = () => {
    const errors: string[] = [];
    
    // 1. Check VAT Accounts presence
    const balanceVatAccounts = currentScenario.rows.filter(r => r.isVat);
    const journalCodes = new Set(journalEntries.map(e => e.code));
    const missingVat = balanceVatAccounts.filter(r => !journalCodes.has(r.code));
    if (missingVat.length > 0) {
      errors.push(`Il manque des comptes TVA : ${missingVat.map(r => r.code).join(', ')}.`);
    }

    // 2. Check non-VAT accounts
    const nonVatTransferred = journalEntries.filter(e => {
      if (e.isManual) return false; 
      const originalRow = currentScenario.rows.find(r => r.code === e.code);
      return originalRow && !originalRow.isVat;
    });
    if (nonVatTransferred.length > 0) {
      errors.push(`Comptes incorrects (non-TVA) détectés : ${nonVatTransferred.map(e => e.code).join(', ')}.`);
    }

    // 3. Check Reversal (Soldering)
    journalEntries.forEach(entry => {
      if (!entry.isManual) {
        const original = currentScenario.rows.find(r => r.code === entry.code);
        if (original) {
          const originalWasDebit = original.debit > 0;
          const journalIsCredit = entry.credit > 0;
          
          if (originalWasDebit && !journalIsCredit) {
            errors.push(`Le compte ${entry.code} n'est pas soldé (il devrait être au crédit).`);
          } else if (!originalWasDebit && journalIsCredit) {
            errors.push(`Le compte ${entry.code} n'est pas soldé (il devrait être au débit).`);
          }
        }
      }
    });

    // 4. Calc Net VAT
    let totalVatPayable = 0; 
    let totalVatRecoverable = 0; 

    balanceVatAccounts.forEach(row => {
        totalVatPayable += row.credit;
        totalVatRecoverable += row.debit;
        totalVatPayable += (row.code.startsWith('41') && row.credit > 0) ? row.credit : 0;
        totalVatRecoverable += (row.code.startsWith('45') && row.debit > 0) ? row.debit : 0;
    });

    const sumVatCreditsInBalance = balanceVatAccounts.reduce((acc, r) => acc + r.credit, 0);
    const sumVatDebitsInBalance = balanceVatAccounts.reduce((acc, r) => acc + r.debit, 0);
    const netPosition = sumVatCreditsInBalance - sumVatDebitsInBalance;
    
    // 5. Check Centralizer
    const centralizerEntry = journalEntries.find(e => e.isManual);
    
    if (Math.abs(netPosition) > 0.01) {
      if (!centralizerEntry) {
        errors.push("Il manque le compte centralisateur (4119 ou 4519).");
      } else {
        const expectedAmount = Math.abs(netPosition);
        const amountMatch = Math.abs((centralizerEntry.debit + centralizerEntry.credit) - expectedAmount) < 0.1;

        if (netPosition > 0) {
          // Payable -> Expect 4519 Credit
          if (centralizerEntry.code !== '4519') errors.push("TVA nette à payer : utilisez le compte 4519.");
          else if (centralizerEntry.credit === 0) errors.push("Le compte 4519 doit être au crédit.");
          else if (!amountMatch) errors.push(`Montant incorrect pour 4519. Attendu : ${formatCurrency(expectedAmount)}.`);
        } else {
          // Recoverable -> Expect 4119 Debit
          if (centralizerEntry.code !== '4119') errors.push("TVA nette à récupérer : utilisez le compte 4119.");
          else if (centralizerEntry.debit === 0) errors.push("Le compte 4119 doit être au débit.");
          else if (!amountMatch) errors.push(`Montant incorrect pour 4119. Attendu : ${formatCurrency(expectedAmount)}.`);
        }
      }
    } else {
        if (centralizerEntry) errors.push("TVA nette nulle : aucun compte centralisateur n'est nécessaire.");
    }

    // 6. Equilibrium
    if (!journalTotals.isBalanced) {
      errors.push(`L'écriture n'est pas équilibrée (Écart : ${formatCurrency(journalTotals.diff)}).`);
    }

    if (errors.length > 0) {
      setFeedback({ type: 'error', message: "Attention, il y a des erreurs :", details: errors });
      setIsScenarioValidated(false);
    } else {
      setFeedback({ type: 'success', message: "Bravo ! La centralisation est parfaite." });
      setIsScenarioValidated(true);
    }
  };

  // --- Render Views ---

  if (appState === 'login') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <div className="flex justify-center mb-6 text-blue-600">
            <School size={64} />
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Institut Saint-Luc de Frameries</h1>
          <h2 className="text-lg text-center text-slate-600 mb-6">Atelier Centralisation TVA</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Adresse email scolaire</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-slate-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="prenom.nom@istlm.org"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin(studentEmail)}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">Format : prenom.nom@istlm.org</p>
            </div>
            
            <button
              onClick={() => handleLogin(studentEmail)}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Commencer l'exercice
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">Application pédagogique créée par Mr Depret pour les élèves de 6e Technique Comptable.</p>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'summary') {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        {/* Screen View */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:hidden">
          <div className="h-64 bg-gradient-to-r from-emerald-500 to-blue-500 relative">
            <img 
              src="https://images.unsplash.com/photo-1533227297135-34dd089c5158?auto=format&fit=crop&q=80&w=1000" 
              alt="Joy celebration" 
              className="w-full h-full object-cover mix-blend-overlay opacity-50"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
              <PartyPopper size={64} className="mb-4 animate-bounce" />
              <h1 className="text-4xl font-bold shadow-black drop-shadow-lg">Félicitations !</h1>
              <p className="text-xl mt-2 drop-shadow-md">Tu as terminé les 5 scénarios avec succès.</p>
            </div>
          </div>
          
          <div className="p-8 text-center space-y-6">
            <p className="text-slate-600">
              Bravo <strong>{studentEmail}</strong>, tu maîtrises maintenant la centralisation de la TVA. 
              Tu peux imprimer ton rapport détaillé pour le rendre à Mr Depret.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-transform active:scale-95"
              >
                <Printer size={20} /> Imprimer le rapport
              </button>
              
              <button 
                onClick={restartGame}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <RefreshCcw size={20} /> Recommencer au début
              </button>
            </div>
          </div>
        </div>

        {/* Print View (Hidden on screen, Visible on Print) */}
        <div className="hidden print:block print:p-8">
          <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Rapport de Centralisation TVA</h1>
              <p className="text-slate-600">Institut Saint-Luc de Frameries - Cours de Comptabilité</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{studentEmail}</p>
              <p className="text-sm text-slate-500">Date : {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-8">
            {completedResults.map((result, index) => (
              <div key={index} className="break-inside-avoid border border-slate-300 rounded-lg p-4">
                <h3 className="text-lg font-bold bg-slate-100 p-2 rounded mb-4 border-b border-slate-200">
                  Scénario {index + 1} : {result.scenarioName}
                </h3>

                {/* Small Balance View for Context */}
                <div className="mb-4">
                  <h4 className="text-sm font-bold uppercase text-slate-500 mb-2">Extrait de la Balance</h4>
                  <table className="w-full text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border p-1 text-left">Compte</th>
                        <th className="border p-1 text-left">Intitulé</th>
                        <th className="border p-1 text-right">Débit</th>
                        <th className="border p-1 text-right">Crédit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.scenarioRows.filter(r => r.isVat).map(row => (
                        <tr key={row.id}>
                          <td className="border p-1 font-mono">{row.code}</td>
                          <td className="border p-1">{row.name}</td>
                          <td className="border p-1 text-right">{row.debit > 0 ? formatCurrency(row.debit) : ''}</td>
                          <td className="border p-1 text-right">{row.credit > 0 ? formatCurrency(row.credit) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Journal Entry */}
                <div>
                  <h4 className="text-sm font-bold uppercase text-slate-500 mb-2">Écriture au Journal (JOD)</h4>
                  <table className="w-full text-sm border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border p-1 text-left">Compte</th>
                        <th className="border p-1 text-left">Intitulé</th>
                        <th className="border p-1 text-right">Débit</th>
                        <th className="border p-1 text-right">Crédit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.studentEntries.map(entry => (
                        <tr key={entry.id}>
                          <td className="border p-1 font-mono font-bold">{entry.code}</td>
                          <td className="border p-1">{entry.name}</td>
                          <td className="border p-1 text-right font-mono">{entry.debit > 0 ? formatCurrency(entry.debit) : ''}</td>
                          <td className="border p-1 text-right font-mono">{entry.credit > 0 ? formatCurrency(entry.credit) : ''}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={2} className="border p-1 text-right">Totaux</td>
                        <td className="border p-1 text-right">{formatCurrency(result.totals.debit)}</td>
                        <td className="border p-1 text-right">{formatCurrency(result.totals.credit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-4 border-t border-slate-400 text-center text-sm text-slate-500">
            Validé par l'application pédagogique "Centralisation TVA" - Mr Depret
          </div>
        </div>
      </div>
    );
  }

  // --- Game View (Existing logic slightly wrapped) ---
  return (
    <div className="min-h-screen pb-12 print:hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Calculator size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Atelier Centralisation TVA</h1>
                <p className="text-xs text-slate-500">Élève : {studentEmail}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-600">
                 Scénario {currentScenarioIndex + 1} / {scenarios.length}
              </div>
              <div className="text-sm font-bold text-slate-800">
                {currentScenario.name}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BookOpen size={100} className="text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-blue-900 mb-2">Consignes</h2>
          <div className="text-blue-800 space-y-2 max-w-3xl text-sm sm:text-base">
            <p>1. <strong>Sélectionne</strong> les comptes de TVA dans la balance ci-dessous.</p>
            <p>2. <strong>Transfère-les</strong> dans le JOD et <strong>solde-les</strong> (inverse D/C).</p>
            <p>3. Calcule la différence et équilibre avec le compte centralisateur (<strong>4119</strong> ou <strong>4519</strong>).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Zone 2: Balance (Source) */}
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full ${isScenarioValidated ? 'opacity-70 pointer-events-none' : ''}`}>
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
                Balance des Comptes
              </h3>
              <span className="text-xs font-mono text-slate-500 bg-slate-200 px-2 py-1 rounded">Source</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3">N°</th>
                    <th className="px-4 py-3">Intitulé</th>
                    <th className="px-4 py-3 text-right">Débit</th>
                    <th className="px-4 py-3 text-right">Crédit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentScenario.rows.map((row) => (
                    <tr 
                      key={row.id} 
                      onClick={() => toggleAccountSelection(row.id)}
                      className={`cursor-pointer transition-colors hover:bg-blue-50 ${selectedAccountIds.has(row.id) ? 'bg-blue-50/80' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedAccountIds.has(row.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                          {selectedAccountIds.has(row.id) && <CheckCircle2 size={14} />}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-900">{row.code}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className={`px-4 py-3 text-right font-mono ${row.debit > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                        {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${row.credit > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                        {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 mt-auto">
              <button 
                onClick={transferToJournal}
                className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                disabled={selectedAccountIds.size === 0}
              >
                Transférer la sélection vers le JOD <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {/* Zone 3: JOD (Target) */}
          <div className="space-y-6">
            <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px] flex flex-col ${isScenarioValidated ? 'pointer-events-none' : ''}`}>
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                  JOD
                </h3>
                {!isScenarioValidated && (
                  <button onClick={resetScenarioState} className="text-slate-400 hover:text-red-500 transition-colors" title="Réinitialiser le journal">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="overflow-x-auto flex-grow">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                      <th className="px-4 py-3 w-16">Action</th>
                      <th className="px-4 py-3">Compte</th>
                      <th className="px-4 py-3 text-right">Débit</th>
                      <th className="px-4 py-3 text-right">Crédit</th>
                      <th className="px-2 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {journalEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                          <p className="mb-2">Le journal est vide.</p>
                          <p className="text-xs">Sélectionne des comptes à gauche.</p>
                        </td>
                      </tr>
                    ) : (
                      journalEntries.map((entry) => (
                        <tr key={entry.id} className="group hover:bg-slate-50">
                          <td className="px-4 py-2">
                             <button 
                                onClick={() => toggleEntrySide(entry.id)}
                                className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors disabled:opacity-50"
                                title="Inverser Débit/Crédit (Solder)"
                                disabled={isScenarioValidated}
                              >
                                <ArrowRightLeft size={14} />
                              </button>
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-mono font-bold text-slate-900">{entry.code}</div>
                            <div className="text-xs truncate max-w-[150px]" title={entry.name}>{entry.name}</div>
                          </td>
                          <td className={`px-4 py-2 text-right font-mono ${entry.debit > 0 ? 'bg-emerald-50/50 text-emerald-800 font-medium' : 'text-slate-300'}`}>
                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                          </td>
                          <td className={`px-4 py-2 text-right font-mono ${entry.credit > 0 ? 'bg-emerald-50/50 text-emerald-800 font-medium' : 'text-slate-300'}`}>
                            {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                          </td>
                          <td className="px-2 py-2 text-right">
                             <button 
                                onClick={() => removeEntry(entry.id)}
                                className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                                disabled={isScenarioValidated}
                              >
                                <Trash2 size={16} />
                              </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {/* Totals Footer */}
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-mono text-sm">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-xs tracking-wider">Totaux</td>
                      <td className={`px-4 py-3 text-right font-bold ${journalTotals.isBalanced ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCurrency(journalTotals.debit)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${journalTotals.isBalanced ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCurrency(journalTotals.credit)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Add Manual Line Area */}
              {!isScenarioValidated && (
                <div className="p-4 bg-slate-100 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Ajouter une ligne (Centralisateur)</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select 
                      className="flex-grow rounded border border-slate-300 text-sm py-1.5 px-2 focus:ring-blue-500 focus:border-blue-500"
                      value={selectedManualAccount}
                      onChange={(e) => setSelectedManualAccount(e.target.value)}
                    >
                      {MANUAL_ACCOUNTS.map(acc => (
                        <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                      ))}
                    </select>
                    <input 
                      type="number" 
                      placeholder="Montant" 
                      className="w-full sm:w-32 rounded border border-slate-300 text-sm py-1.5 px-2 font-mono"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                    />
                    <button 
                      onClick={addManualEntry}
                      disabled={!manualAmount || parseFloat(manualAmount) <= 0}
                      className="bg-slate-800 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <Plus size={16} /> Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Verification & Feedback */}
            <div className="space-y-4">
               {!isScenarioValidated ? (
                 <button 
                  onClick={verifyEntry}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-200 transition-all active:translate-y-0.5"
                >
                  Vérifier mon écriture
                </button>
               ) : (
                 <button 
                  onClick={goToNextScenario}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:translate-y-0.5 animate-pulse"
                >
                   {isLastScenario ? "Voir les résultats" : "Passer au scénario suivant"} &rarr;
                </button>
               )}

              {feedback && (
                <div className={`rounded-xl p-5 border shadow-sm animate-in fade-in slide-in-from-bottom-2 ${
                  feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 
                  feedback.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : 
                  'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      feedback.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                      feedback.type === 'error' ? 'bg-red-100 text-red-600' : 
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {feedback.type === 'success' ? <CheckCircle2 size={24} /> : 
                       feedback.type === 'error' ? <AlertCircle size={24} /> : 
                       <RefreshCcw size={24} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{feedback.message}</h4>
                      {feedback.details && (
                        <ul className="mt-2 space-y-1 list-disc list-inside text-sm opacity-90">
                          {feedback.details.map((detail, idx) => (
                            <li key={idx}>{detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
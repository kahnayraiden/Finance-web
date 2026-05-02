"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Loader2,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  categoryId: string | null;
  category: Category | null;
  note: string | null;
  date: string;
  source: string;
}

interface SyncResult {
  emailsFetched: number;
  transactionsParsed: number;
  imported: number;
  skipped: number;
  errors: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Form state
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState("expense");
  const [formCategory, setFormCategory] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchData = async () => {
    try {
      const [txRes, catRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/categories"),
      ]);
      const txData = await txRes.json();
      const catData = await catRes.json();
      setTransactions(txData);
      setCategories(catData);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!formAmount || !formDate) return;
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(formAmount),
          type: formType,
          categoryId: formCategory || null,
          note: formNote || null,
          date: formDate,
          source: "manual",
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setFormAmount("");
        setFormType("expense");
        setFormCategory("");
        setFormNote("");
        setFormDate(new Date().toISOString().split("T")[0]);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to create transaction", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to delete transaction", err);
    }
  };

  const handleUpdateCategory = async (txId: string, categoryId: string) => {
    try {
      const res = await fetch(`/api/transactions/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: categoryId === "none" ? null : categoryId }),
      });
      if (res.ok) {
        // Update local state instead of full fetch to feel snappier
        setTransactions(transactions.map((tx) => {
          if (tx.id === txId) {
            const cat = categoryId === "none" ? null : categories.find(c => c.id === categoryId) || null;
            return { ...tx, categoryId, category: cat };
          }
          return tx;
        }));
      }
    } catch (err) {
      console.error("Failed to update category", err);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      // Force sync last 30 days of emails from Gmail
      const res = await fetch("/api/email/sync?days=30", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (res.ok) {
        setSyncResult(data);
        // Refresh transaction list after sync
        fetchData();
      } else {
        setSyncError(data.error || "Sync failed");
      }
    } catch (err: any) {
      setSyncError(err.message || "Network error");
    } finally {
      setSyncing(false);

      // Auto-dismiss result after 8 seconds
      setTimeout(() => {
        setSyncResult(null);
        setSyncError(null);
      }, 8000);
    }
  };

  const filteredTransactions =
    filterType === "all"
      ? transactions
      : transactions.filter((t) => t.type === filterType);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Count email-sourced transactions
  const emailCount = transactions.filter((t) => t.source !== "manual").length;
  const manualCount = transactions.filter((t) => t.source === "manual").length;

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 mt-1">
            Manage your income and expenses
          </p>
          <div className="flex gap-3 mt-2">
            <span className="text-xs text-slate-400">
              {transactions.length} total
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {emailCount} from email
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-400">
              {manualCount} manual
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleForceSync}
            disabled={syncing}
            className="gap-2"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncing ? "Syncing..." : "Force Sync"}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
                <DialogDescription>
                  Create a new income or expense record.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formCategory}
                    onValueChange={setFormCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c.type === formType)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Input
                    id="note"
                    placeholder="Optional note..."
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} className="w-full">
                  Create Transaction
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncResult && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-700 text-sm">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>
              <strong>Sync complete.</strong>{" "}
              Fetched {syncResult.emailsFetched} email{syncResult.emailsFetched !== 1 ? "s" : ""},{" "}
              parsed {syncResult.transactionsParsed} transaction{syncResult.transactionsParsed !== 1 ? "s" : ""},{" "}
              imported <strong>{syncResult.imported}</strong>,{" "}
              skipped {syncResult.skipped} duplicate{syncResult.skipped !== 1 ? "s" : ""}.
            </span>
          </div>
          <button
            onClick={() => setSyncResult(null)}
            className="text-emerald-400 hover:text-emerald-600 text-sm ml-4"
          >
            ✕
          </button>
        </div>
      )}
      {syncError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{syncError}</span>
          </div>
          <button
            onClick={() => setSyncError(null)}
            className="text-red-400 hover:text-red-600 text-sm ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {["all", "income", "expense"].map((type) => (
          <Button
            key={type}
            variant={filterType === type ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(type)}
            className="capitalize"
          >
            {type === "all" ? "All" : type}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              Loading...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Filter className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">No transactions found</p>
              <p className="text-sm">Add your first transaction above.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Note</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-700">
                      {new Date(tx.date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {tx.type === "income" ? (
                          <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="capitalize">{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Select
                        value={tx.categoryId || "none"}
                        onValueChange={(val) => handleUpdateCategory(tx.id, val)}
                      >
                        <SelectTrigger className="h-8 w-[130px] border-transparent bg-slate-50 hover:bg-slate-100 text-xs">
                          <SelectValue placeholder="No Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Category</SelectItem>
                          {categories
                            .filter((c) => c.type === tx.type)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-48 truncate">
                      {tx.note || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={tx.source !== "manual" ? "default" : "outline"}
                        className={`capitalize text-xs font-medium ${
                          tx.source !== "manual"
                            ? tx.source === "VCB"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                              : tx.source === "Timo"
                              ? "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100"
                              : "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100"
                            : ""
                        }`}
                      >
                        {tx.source !== "manual" && (
                          <Mail className="h-3 w-3 mr-1.5" />
                        )}
                        {tx.source === "email" ? "Email" : tx.source}
                      </Badge>
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-semibold ${
                        tx.type === "income"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tx.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

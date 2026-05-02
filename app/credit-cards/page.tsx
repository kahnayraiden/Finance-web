"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus,
  Trash2,
  CreditCard as CreditCardIcon,
  Upload,
} from "lucide-react";

interface CreditCardTransaction {
  id: string;
  cardId: string;
  amount: number;
  date: string;
  description: string;
}

interface CreditCardType {
  id: string;
  name: string;
  limitAmount: number;
  transactions: CreditCardTransaction[];
}

export default function CreditCardsPage() {
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formName, setFormName] = useState("");
  const [formLimit, setFormLimit] = useState("");

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const formatNumberInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return parseInt(digits, 10).toLocaleString("vi-VN").replace(/,/g, ".");
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/credit-cards");
      const data = await res.json();
      setCards(data);
    } catch (err) {
      console.error("Failed to fetch credit cards", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!formName || !formLimit) return;
    const limitNumeric = parseFloat(formLimit.replace(/\./g, ""));
    try {
      const res = await fetch("/api/credit-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          limitAmount: limitNumeric,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setFormName("");
        setFormLimit("");
        fetchData();
      }
    } catch (err) {
      console.error("Failed to create credit card", err);
    }
  };

  const handleAddTransaction = async () => {
    if (!txAmount || !txDate || !txDesc || !activeCardId) return;
    let amountNumeric = parseFloat(txAmount.replace(/\./g, ""));
    if (txType === "income") {
      amountNumeric = -Math.abs(amountNumeric);
    } else {
      amountNumeric = Math.abs(amountNumeric);
    }
    try {
      const res = await fetch(`/api/credit-cards/${activeCardId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNumeric,
          date: txDate,
          description: txDesc,
        }),
      });
      if (res.ok) {
        setTxDialogOpen(false);
        setTxAmount("");
        setTxDate("");
        setTxDesc("");
        fetchData();
      }
    } catch (err) {
      console.error("Failed to add transaction", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/credit-cards/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to delete credit card", err);
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile || !selectedCardId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("cardId", selectedCardId);

      const res = await fetch("/api/pdf/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setUploadDialogOpen(false);
        setPdfFile(null);
        setSelectedCardId(null);
        fetchData();
        alert(`Successfully imported ${result.imported} transactions.`);
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.error}`);
      }
    } catch (err) {
      console.error("Failed to upload PDF", err);
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Calculate totals across all cards
  const allTransactions = cards.flatMap((c) => c.transactions);
  const totalDebt = allTransactions.reduce((sum, t) => sum + t.amount, 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlySpending = allTransactions
    .filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Credit Cards</h1>
          <p className="text-slate-500 mt-1">
            Manage cards and track spending
          </p>
        </div>
        <div className="flex gap-2">
          {/* PDF Upload Dialog */}
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Import PDF
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import PDF Statement</DialogTitle>
                <DialogDescription>
                  Upload a credit card PDF statement to auto-import transactions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Select Card</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedCardId || ""}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                  >
                    <option value="">Choose a card...</option>
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>PDF File</Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) =>
                      setPdfFile(e.target.files?.[0] || null)
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handlePdfUpload}
                  disabled={!pdfFile || !selectedCardId || uploading}
                  className="w-full"
                >
                  {uploading ? "Uploading..." : "Upload & Import"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Card Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Card
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Credit Card</DialogTitle>
                <DialogDescription>
                  Register a new credit card to track.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Card Name</Label>
                  <Input
                    placeholder="e.g. Visa Platinum"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Credit Limit</Label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={formLimit}
                    onChange={(e) => setFormLimit(formatNumberInput(e.target.value))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} className="w-full">
                  Add Card
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Transaction Dialog */}
          <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Manual Transaction</DialogTitle>
                <DialogDescription>
                  Enter transaction details manually.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as "expense" | "income")}
                  >
                    <option value="expense">Expense (Trừ tiền)</option>
                    <option value="income">Payment/Income (Cộng tiền/Hoàn tiền)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (VND)</Label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={txAmount}
                    onChange={(e) => setTxAmount(formatNumberInput(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Transaction details"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddTransaction} className="w-full">
                  Add Transaction
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Total Debt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalDebt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Monthly Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(monthlySpending)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading...</div>
      ) : cards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400">
            <CreditCardIcon className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">No credit cards added</p>
            <p className="text-sm">Add your first card above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {cards.map((card) => {
            const cardDebt = card.transactions.reduce(
              (sum, t) => sum + t.amount,
              0
            );
            const utilization = card.limitAmount
              ? ((cardDebt / card.limitAmount) * 100).toFixed(1)
              : 0;

            return (
              <Card key={card.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <CreditCardIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{card.name}</CardTitle>
                        <p className="text-sm text-slate-500">
                          Limit: {formatCurrency(card.limitAmount)} •
                          Utilization: {utilization}%
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/credit-cards/${card.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8"
                        >
                          Details
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveCardId(card.id);
                          setTxDialogOpen(true);
                        }}
                        className="text-xs h-8"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Tx
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(card.id)}
                        className="text-slate-400 hover:text-red-600 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Utilization bar */}
                  <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(Number(utilization), 100)}%`,
                      }}
                    />
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

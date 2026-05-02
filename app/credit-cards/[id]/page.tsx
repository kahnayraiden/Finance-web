"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard as CreditCardIcon } from "lucide-react";
import Link from "next/link";

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

export default function CreditCardDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [card, setCard] = useState<CreditCardType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const res = await fetch(`/api/credit-cards/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setCard(data);
        }
      } catch (err) {
        console.error("Failed to fetch card details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [params.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading...</div>;
  }

  if (!card) {
    return <div className="p-8 text-center text-slate-400">Card not found</div>;
  }

  const cardDebt = card.transactions.reduce((sum, t) => sum + t.amount, 0);
  const utilization = card.limitAmount
    ? ((cardDebt / card.limitAmount) * 100).toFixed(1)
    : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/credit-cards">
          <Button variant="ghost" className="gap-2 text-slate-500 hover:text-slate-900 -ml-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Credit Cards
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden mb-8">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <CreditCardIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">{card.name}</CardTitle>
              <p className="text-slate-500 mt-1">
                Limit: {formatCurrency(card.limitAmount)} • Utilization: {utilization}%
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(Number(utilization), 100)}%`,
              }}
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions ({card.transactions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {card.transactions.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">
              No transactions found.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 border-y">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Date</th>
                  <th className="px-6 py-3 text-left font-medium">Description</th>
                  <th className="px-6 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {card.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {tx.description}
                    </td>
                    <td className={`px-6 py-4 text-right font-medium whitespace-nowrap ${tx.amount < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.amount < 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
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

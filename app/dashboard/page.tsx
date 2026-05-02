import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react";
import DashboardCharts from "@/components/charts/dashboard-charts";

async function getDashboardData() {
  const transactions = await prisma.transaction.findMany({
    include: { category: true },
    orderBy: { date: "desc" },
  });

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Group expenses by category for pie chart
  const categoryMap = new Map<string, number>();
  transactions
    .filter((t) => t.type === "expense" && t.category)
    .forEach((t) => {
      const name = t.category!.name;
      categoryMap.set(name, (categoryMap.get(name) || 0) + t.amount);
    });

  const categoryData = Array.from(categoryMap.entries()).map(
    ([name, value]) => ({
      name,
      value,
    })
  );

  // Group by month for line chart (last 6 months)
  const monthlyData: { month: string; income: number; expense: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    const monthIncome = transactions
      .filter(
        (t) =>
          t.type === "income" &&
          new Date(t.date).getMonth() === d.getMonth() &&
          new Date(t.date).getFullYear() === d.getFullYear()
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const monthExpense = transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          new Date(t.date).getMonth() === d.getMonth() &&
          new Date(t.date).getFullYear() === d.getFullYear()
      )
      .reduce((sum, t) => sum + t.amount, 0);

    monthlyData.push({
      month: monthStr,
      income: monthIncome,
      expense: monthExpense,
    });
  }

  return { totalIncome, totalExpense, balance, categoryData, monthlyData };
}

export default async function DashboardPage() {
  const { totalIncome, totalExpense, balance, categoryData, monthlyData } =
    await getDashboardData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your financial health</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100 flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-0 shadow-lg shadow-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-100 flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Total Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-lg shadow-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <DashboardCharts
        categoryData={categoryData}
        monthlyData={monthlyData}
      />
    </div>
  );
}

import { Text, TouchableOpacity, View } from "react-native";
import * as React from "react";
import { BarChart, barDataItem } from "react-native-gifted-charts";
import Card from "./UI/Card";
import { useSQLiteContext } from "expo-sqlite/next";
import { processWeeklyData } from "../queries/ChartQuery";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { SymbolView } from "expo-symbols";

enum Period {
  week = "week",
  month = "month",
  year = "year",
}

export default function SummaryChart() {
  const db = useSQLiteContext();

  const [chartData, setChartData] = React.useState<barDataItem[]>([]);
  const [chartPeriod, setChartPeriod] = React.useState<Period>(Period.week);
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [currentEndDate, setCurrentEndDate] = React.useState<Date>(new Date());
  const [chartKey, setChartKey] = React.useState(0);
  const [transactionType, setTransactionType] = React.useState<
    "Income" | "Expense"
  >("Income");

  React.useEffect(() => {
    const fetchData = async () => {
      if (chartPeriod === Period.week) {
        const { startDate, endDate } = getWeekRange(currentDate);
        setCurrentEndDate(() => new Date(startDate));
        const data = await fetchWeeklyData(
          Math.floor(startDate / 1000),
          Math.floor(endDate / 1000),
          transactionType
        );
        setChartData(processWeeklyData(data, transactionType));
        setChartKey((prev) => prev + 1);
      }
    };
    fetchData();
  }, [chartPeriod, currentDate, transactionType]);

  // Fetch transactions for a specific week

  const fetchWeeklyData = async (
    startDate: number,
    endDate: number,
    type: "Income" | "Expense"
  ) => {
    try {
      const query = `
        SELECT 
          strftime('%w', date, 'unixepoch') AS day_of_week,
          SUM(amount) as total 
        FROM Transactions 
        WHERE date >= ? AND date <= ? AND type = ? 
        GROUP BY day_of_week
        ORDER BY day_of_week ASC
        `;

      const result = await db.getAllAsync<{
        day_of_week: number;
        total: number;
      }>(query, [startDate, endDate, type]);

      return result;
    } catch (e) {
      console.error("Error fetching weekly data:", e);
      return [];
    }
  };

  const getWeekRange = (date: Date) => {
    const startOfWeek = new Date(date.setDate(date.getDate() - date.getDay()));
    const endOfWeek = new Date(date.setDate(startOfWeek.getDate() + 6));
    startOfWeek.setHours(0, 0, 0, 0); // Start of the day
    endOfWeek.setHours(23, 59, 59, 999); // End of the day
    return {
      startDate: startOfWeek.getTime(),
      endDate: endOfWeek.getTime(),
    };
  };

  const handlePreviousWeek = () => {
    setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)));
  };

  const handleNextWeek = () => {
    setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)));
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <Text style={{ fontWeight: "700", fontSize: 32 }}>
        {" "}
        {currentEndDate.toLocaleDateString("en-US", { month: "short" })}{" "}
        {currentEndDate.getDate()}-{" "}
        {currentDate.toLocaleDateString("en-US", { month: "short" })}{" "}
        {currentDate.getDate()}, {currentDate.getFullYear()}
      </Text>
      <Text>Total {transactionType === "Expense" ? "Spending" : "Income"}</Text>
      <Text style={{ fontWeight: "700", fontSize: 32, marginBottom: 16 }}>
        ${chartData.reduce((total, item) => total + item.value, 0)}
      </Text>
      <BarChart
        key={chartKey}
        data={chartData}
        height={200}
        width={290}
        barWidth={18}
        minHeight={3}
        barBorderRadius={3}
        spacing={20}
        noOfSections={4}
        yAxisThickness={0}
        xAxisThickness={0}
        xAxisLabelTextStyle={{ color: "gray" }}
        yAxisTextStyle={{ color: "gray" }}
        isAnimated
        animationDuration={300}
        showGradient
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          margin: 16,
        }}
      >
        <TouchableOpacity
          style={{ alignItems: "center" }}
          onPress={handlePreviousWeek}
        >
          <SymbolView
            name="chevron.left.circle.fill"
            size={40}
            type="hierarchical"
            tintColor={"gray"}
          />
          <Text style={{ fontSize: 11, color: "gray" }}>Prev week</Text>
        </TouchableOpacity>
        <SegmentedControl
          values={["Income", "Expense"]}
          selectedIndex={transactionType === "Income" ? 0 : 1}
          style={{ width: 180 }}
          onChange={(event) => {
            const index = event.nativeEvent.selectedSegmentIndex;
            setTransactionType(index === 0 ? "Income" : "Expense");
          }}
        />
        <TouchableOpacity
          style={{ alignItems: "center" }}
          onPress={handleNextWeek}
        >
          <SymbolView
            name="chevron.right.circle.fill"
            size={40}
            type="hierarchical"
            tintColor={"gray"}
          />
          <Text style={{ fontSize: 11, color: "gray" }}>Next week</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

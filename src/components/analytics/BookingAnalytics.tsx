
import { useState, useEffect } from 'react';
import { format, subDays, subMonths, subYears, startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  ChartContainer, 
  ChartTooltip,
  ChartTooltipContent, 
} from '@/components/ui/chart';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  Legend,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar, ChartPie, TrendingUp, DollarSign } from 'lucide-react';

interface BookingAnalyticsProps {
  venueIds: string[];
}

type TimeRange = '24h' | '7d' | '30d' | '1y';

interface BookingData {
  date: string;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  revenue: number; // Added revenue field
}

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

const BookingAnalytics = ({ venueIds }: BookingAnalyticsProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [bookingsData, setBookingsData] = useState<BookingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAsPercentage, setShowAsPercentage] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area'>('bar');
  const [revenueTotal, setRevenueTotal] = useState<number>(0); // Added total revenue state
  const [summaryData, setSummaryData] = useState<{
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    total: number;
  }>({
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
    total: 0,
  });

  // Colors for the different booking statuses
  const statusColors = {
    pending: '#f59e0b',    // Amber
    confirmed: '#10b981',  // Green
    cancelled: '#ef4444',  // Red
    completed: '#3b82f6',  // Blue
    revenue: '#8b5cf6',    // Purple for revenue
  };

  // Create the pie chart data
  const pieData = [
    { name: 'Pending', value: summaryData.pending, color: statusColors.pending },
    { name: 'Confirmed', value: summaryData.confirmed, color: statusColors.confirmed },
    { name: 'Cancelled', value: summaryData.cancelled, color: statusColors.cancelled },
    { name: 'Completed', value: summaryData.completed, color: statusColors.completed },
  ].filter(item => item.value > 0);

  useEffect(() => {
    if (venueIds.length > 0) {
      fetchBookingData();
    }
  }, [venueIds, timeRange]);

  const getDateRangeForQuery = () => {
    const now = new Date();
    
    let startDate;
    switch (timeRange) {
      case '24h':
        startDate = startOfDay(subDays(now, 1));
        break;
      case '7d':
        startDate = startOfWeek(subDays(now, 7));
        break;
      case '30d':
        startDate = startOfMonth(subMonths(now, 1));
        break;
      case '1y':
        startDate = startOfYear(subYears(now, 1));
        break;
      default:
        startDate = startOfWeek(subDays(now, 7));
    }
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd')
    };
  };
  
  const fetchBookingData = async () => {
    setIsLoading(true);

    try {
      const { startDate, endDate } = getDateRangeForQuery();
      
      // Fetch all bookings for the venue(s) in the selected time range
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .in('venue_id', venueIds)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .order('booking_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching booking data:', error);
        return;
      }
      
      // Group bookings by date and status
      const groupedByDate: { [key: string]: { [key: string]: number, revenue: number } } = {};
      const totalsByStatus = {
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0,
        total: 0
      };
      
      let totalRevenue = 0;
      
      bookingsData?.forEach(booking => {
        const date = format(new Date(booking.booking_date), 'MMM dd');
        const status = booking.status || 'pending';
        const price = Number(booking.total_price) || 0;
        
        // Initialize date in the groupedByDate object if it doesn't exist
        if (!groupedByDate[date]) {
          groupedByDate[date] = {
            pending: 0,
            confirmed: 0,
            cancelled: 0,
            completed: 0,
            revenue: 0
          };
        }
        
        // Increment the count for the current status
        groupedByDate[date][status]++;
        
        // Only add revenue for confirmed and completed bookings
        if (status === 'confirmed' || status === 'completed') {
          groupedByDate[date].revenue += price;
          totalRevenue += price;
        }
        
        // Update totals
        if (status in totalsByStatus) {
          totalsByStatus[status as keyof typeof totalsByStatus]++;
          totalsByStatus.total++;
        }
      });
      
      // Convert the grouped data to an array for the chart
      const chartData: BookingData[] = Object.keys(groupedByDate).map(date => ({
        date,
        pending: groupedByDate[date].pending || 0,
        confirmed: groupedByDate[date].confirmed || 0,
        cancelled: groupedByDate[date].cancelled || 0,
        completed: groupedByDate[date].completed || 0,
        revenue: groupedByDate[date].revenue || 0,
      }));
      
      setBookingsData(chartData);
      setSummaryData(totalsByStatus);
      setRevenueTotal(totalRevenue);
    } catch (error) {
      console.error('Error in fetchBookingData:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderChartContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center text-findvenue-text-muted">
            Loading analytics data...
          </div>
        </div>
      );
    }
    
    if (bookingsData.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center text-findvenue-text-muted">
            No booking data available for the selected time period
          </div>
        </div>
      );
    }

    switch (chartType) {
      case 'area':
        return (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bookingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ background: '#222', borderRadius: '8px', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenue (SAR)" 
                  stroke={statusColors.revenue} 
                  fill={statusColors.revenue} 
                  fillOpacity={0.6} 
                  activeDot={{ r: 8 }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="confirmed" 
                  name="Confirmed" 
                  stroke={statusColors.confirmed} 
                  fill={statusColors.confirmed} 
                  fillOpacity={0.3} 
                  activeDot={{ r: 6 }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  name="Completed" 
                  stroke={statusColors.completed} 
                  fill={statusColors.completed} 
                  fillOpacity={0.3} 
                  activeDot={{ r: 6 }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case 'pie': 
        return (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value} bookings`, name]} 
                  contentStyle={{ background: '#222', borderRadius: '8px', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
        
      case 'line':
        return (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bookingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" yAxisId="left" />
                <YAxis stroke="#888" yAxisId="right" orientation="right" />
                <Tooltip
                  contentStyle={{ background: '#222', borderRadius: '8px', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pending"
                  name="Pending"
                  stroke={statusColors.pending}
                  yAxisId="left"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="confirmed"
                  name="Confirmed"
                  stroke={statusColors.confirmed}
                  yAxisId="left"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="cancelled"
                  name="Cancelled"
                  stroke={statusColors.cancelled}
                  yAxisId="left"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke={statusColors.completed}
                  yAxisId="left"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue (SAR)"
                  stroke={statusColors.revenue}
                  yAxisId="right"
                  activeDot={{ r: 8 }}
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
        
      case 'bar':
      default:
        return (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{ background: '#222', borderRadius: '8px', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar 
                  dataKey="pending" 
                  name="Pending" 
                  fill={statusColors.pending} 
                  stackId={showAsPercentage ? "stack" : undefined}
                />
                <Bar 
                  dataKey="confirmed" 
                  name="Confirmed" 
                  fill={statusColors.confirmed} 
                  stackId={showAsPercentage ? "stack" : undefined}
                />
                <Bar 
                  dataKey="cancelled" 
                  name="Cancelled" 
                  fill={statusColors.cancelled} 
                  stackId={showAsPercentage ? "stack" : undefined}
                />
                <Bar 
                  dataKey="completed" 
                  name="Completed" 
                  fill={statusColors.completed} 
                  stackId={showAsPercentage ? "stack" : undefined}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <CardTitle>Booking Analytics</CardTitle>
            <CardDescription>Track booking performance over time</CardDescription>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mt-4 md:mt-0">
            {/* Time range selector */}
            <ToggleGroup 
              type="single" 
              value={timeRange} 
              onValueChange={(value) => value && setTimeRange(value as TimeRange)}
              size="sm"
              className="justify-start"
            >
              <ToggleGroupItem value="24h">24h</ToggleGroupItem>
              <ToggleGroupItem value="7d">7 days</ToggleGroupItem>
              <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
              <ToggleGroupItem value="1y">Year</ToggleGroupItem>
            </ToggleGroup>
            
            {/* Chart type selector */}
            <ToggleGroup 
              type="single" 
              value={chartType} 
              onValueChange={(value) => value && setChartType(value as 'bar' | 'line' | 'pie' | 'area')}
              size="sm"
              className="justify-start"
            >
              <ToggleGroupItem value="bar" title="Bar Chart">
                <ChartPie className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="line" title="Line Chart">
                <TrendingUp className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="pie" title="Pie Chart">
                <ChartPie className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="area" title="Area Chart">
                <TrendingUp className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
            {chartType !== 'pie' && chartType !== 'area' && (
              <div className="flex items-center space-x-2">
                <Switch 
                  id="stacked-chart" 
                  checked={showAsPercentage}
                  onCheckedChange={setShowAsPercentage}
                />
                <Label htmlFor="stacked-chart">Stacked</Label>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="bg-card/50 rounded-md p-3 border border-border/20">
            <div className="text-sm text-muted-foreground">Pending</div>
            <div className="text-2xl font-semibold mt-1 text-amber-500">{summaryData.pending}</div>
          </div>
          <div className="bg-card/50 rounded-md p-3 border border-border/20">
            <div className="text-sm text-muted-foreground">Confirmed</div>
            <div className="text-2xl font-semibold mt-1 text-green-500">{summaryData.confirmed}</div>
          </div>
          <div className="bg-card/50 rounded-md p-3 border border-border/20">
            <div className="text-sm text-muted-foreground">Cancelled</div>
            <div className="text-2xl font-semibold mt-1 text-red-500">{summaryData.cancelled}</div>
          </div>
          <div className="bg-card/50 rounded-md p-3 border border-border/20">
            <div className="text-sm text-muted-foreground">Completed</div>
            <div className="text-2xl font-semibold mt-1 text-blue-500">{summaryData.completed}</div>
          </div>
          <div className="bg-card/50 rounded-md p-3 border border-border/20">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-semibold mt-1 text-purple-500">SAR {revenueTotal.toLocaleString()}</div>
          </div>
        </div>
        
        {renderChartContent()}
      </CardContent>
    </Card>
  );
};

export default BookingAnalytics;

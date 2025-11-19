import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DatabaseStatusChartProps {
  labels: string[];
  values: number[];
}

const statusColors: Record<string, string> = {
  RUNNING: '#10b981',
  STOPPED: '#64748b',
  CREATING: '#06b6d4',
  FAILED: '#ef4444',
};

export default function DatabaseStatusChart({ labels, values }: DatabaseStatusChartProps) {
  const backgroundColors = labels.map(label => statusColors[label] || '#64748b');
  
  const data = {
    labels: labels.map(label => {
      switch (label) {
        case 'RUNNING': return 'Running';
        case 'STOPPED': return 'Stopped';
        case 'CREATING': return 'Creating';
        case 'FAILED': return 'Failed';
        default: return label;
      }
    }),
    datasets: [
      {
        data: values,
        backgroundColor: backgroundColors,
        borderColor: '#050810',
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(5, 8, 16, 0.9)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(6, 182, 212, 0.5)',
        borderWidth: 1,
      },
    },
  };

  return (
    <div className="h-64 w-full flex items-center justify-center">
      <div className="w-48 h-48">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
  Paper
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  BarChart,
  Bar,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend 
} from 'recharts';

// Constant colors for visualization
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

/**
 * Audience Insights Component
 * Provides demographic and audience targeting data from Meta Ads
 */
const AudienceInsights = ({ insights, loading }) => {
  // States for audience data
  const [demographicData, setDemographicData] = useState({
    age: [],
    gender: [],
    region: []
  });
  const [deviceData, setDeviceData] = useState([]);
  const [platformData, setPlatformData] = useState([]);
  const [processingData, setProcessingData] = useState(false);
  
  // Effect to process audience data when insights change
  useEffect(() => {
    if (insights && insights.length > 0) {
      setProcessingData(true);
      
      // Process demographic data (simulated for now)
      simulateDemographicData();
      
      // Process device and platform data (simulated for now)
      simulateDeviceAndPlatformData();
      
      setProcessingData(false);
    }
  }, [insights]);

  /**
   * Simulate demographic data
   * In a real implementation, this would be replaced with actual Meta Ads demographic data
   */
  const simulateDemographicData = () => {
    // Age groups
    const ageData = [
      { name: '18-24', value: 15 + Math.random() * 10 },
      { name: '25-34', value: 25 + Math.random() * 15 },
      { name: '35-44', value: 20 + Math.random() * 12 },
      { name: '45-54', value: 15 + Math.random() * 8 },
      { name: '55-64', value: 10 + Math.random() * 5 },
      { name: '65+', value: 5 + Math.random() * 5 }
    ];
    
    // Gender
    const genderData = [
      { name: 'Masculino', value: 45 + Math.random() * 10 },
      { name: 'Feminino', value: 45 + Math.random() * 10 },
      { name: 'Outro', value: Math.random() * 5 }
    ];
    
    // Regions (Brazil)
    const regionData = [
      { name: 'Sudeste', value: 40 + Math.random() * 15 },
      { name: 'Nordeste', value: 20 + Math.random() * 10 },
      { name: 'Sul', value: 15 + Math.random() * 10 },
      { name: 'Centro-Oeste', value: 10 + Math.random() * 8 },
      { name: 'Norte', value: 5 + Math.random() * 5 }
    ];
    
    setDemographicData({
      age: ageData,
      gender: genderData,
      region: regionData
    });
  };
  
  /**
   * Simulate device and platform data
   * In a real implementation, this would be replaced with actual Meta Ads device and platform data
   */
  const simulateDeviceAndPlatformData = () => {
    // Device types
    const deviceTypes = [
      { name: 'Mobile', value: 65 + Math.random() * 15 },
      { name: 'Desktop', value: 25 + Math.random() * 15 },
      { name: 'Tablet', value: 5 + Math.random() * 5 }
    ];
    
    // Platforms
    const platforms = [
      { name: 'Facebook', value: 45 + Math.random() * 15 },
      { name: 'Instagram', value: 35 + Math.random() * 15 },
      { name: 'Audience Network', value: 10 + Math.random() * 10 },
      { name: 'Messenger', value: 5 + Math.random() * 5 }
    ];
    
    setDeviceData(deviceTypes);
    setPlatformData(platforms);
  };
  
  /**
   * Render demographic pie chart
   */
  const renderPieChart = (data, dataKey = 'value', nameKey = 'name') => {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };
  
  /**
   * Custom label for pie chart
   */
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  // If loading or processing, show progress
  if (loading || processingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // If no data available
  if (!insights || insights.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" color="textSecondary" align="center">
            Nenhum dado de audiência disponível
          </Typography>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Box sx={{ mt: 2 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Insights de Audiência
              <Tooltip title="Esta visualização mostra informações demográficas e de dispositivos da sua audiência no Meta Ads. Dados simulados para demonstração.">
                <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', color: 'text.secondary' }} />
              </Tooltip>
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          {/* Demographics Section */}
          <Typography variant="subtitle1" gutterBottom>
            Distribuição Demográfica
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" align="center" gutterBottom>
                  Idade
                </Typography>
                {renderPieChart(demographicData.age)}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" align="center" gutterBottom>
                  Gênero
                </Typography>
                {renderPieChart(demographicData.gender)}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" align="center" gutterBottom>
                  Região
                </Typography>
                {renderPieChart(demographicData.region)}
              </Paper>
            </Grid>
          </Grid>
          
          {/* Device and Platform Section */}
          <Typography variant="subtitle1" gutterBottom>
            Distribuição por Dispositivo e Plataforma
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" align="center" gutterBottom>
                  Tipo de Dispositivo
                </Typography>
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={deviceData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="value" name="Distribuição (%)" fill="#8884d8">
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" align="center" gutterBottom>
                  Plataforma
                </Typography>
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={platformData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="value" name="Distribuição (%)" fill="#82ca9d">
                        {platformData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AudienceInsights;

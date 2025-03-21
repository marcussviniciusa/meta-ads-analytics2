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
      
      try {
        // Process demographic data if available
        // If not available in data structure, generate simulation
        const hasDemographics = insights.some(insight => 
          insight.age_breakdown || insight.gender_breakdown || insight.region_breakdown
        );
        
        if (hasDemographics) {
          processDemographicData(insights);
        } else {
          generateSimulatedDemographicData();
        }
        
        // Process device data if available
        const hasDeviceData = insights.some(insight => insight.device_breakdown);
        
        if (hasDeviceData) {
          processDeviceData(insights);
        } else {
          generateSimulatedDeviceData();
        }
        
        // Process platform data if available
        const hasPlatformData = insights.some(insight => insight.platform_breakdown);
        
        if (hasPlatformData) {
          processPlatformData(insights);
        } else {
          generateSimulatedPlatformData();
        }
      } catch (error) {
        console.error('Erro ao processar dados de audiência:', error.message || 'Erro desconhecido');
      } finally {
        setProcessingData(false);
      }
    }
  }, [insights]);

  /**
   * Process demographic data from API insights
   */
  const processDemographicData = (insights) => {
    // Age groups
    const ageData = insights.reduce((acc, insight) => {
      if (insight.age_breakdown) {
        Object.keys(insight.age_breakdown).forEach(ageRange => {
          const value = insight.age_breakdown[ageRange];
          const existingAge = acc.find(age => age.name === ageRange);
          if (existingAge) {
            existingAge.value += value;
          } else {
            acc.push({ name: ageRange, value });
          }
        });
      }
      return acc;
    }, []);

    // Gender
    const genderData = insights.reduce((acc, insight) => {
      if (insight.gender_breakdown) {
        Object.keys(insight.gender_breakdown).forEach(gender => {
          const value = insight.gender_breakdown[gender];
          const existingGender = acc.find(gender => gender.name === gender);
          if (existingGender) {
            existingGender.value += value;
          } else {
            acc.push({ name: gender, value });
          }
        });
      }
      return acc;
    }, []);

    // Regions (Brazil)
    const regionData = insights.reduce((acc, insight) => {
      if (insight.region_breakdown) {
        Object.keys(insight.region_breakdown).forEach(region => {
          const value = insight.region_breakdown[region];
          const existingRegion = acc.find(region => region.name === region);
          if (existingRegion) {
            existingRegion.value += value;
          } else {
            acc.push({ name: region, value });
          }
        });
      }
      return acc;
    }, []);

    setDemographicData({
      age: ageData,
      gender: genderData,
      region: regionData
    });
  };

  /**
   * Process device data from API insights
   */
  const processDeviceData = (insights) => {
    // Device types
    const deviceTypes = insights.reduce((acc, insight) => {
      if (insight.device_breakdown) {
        Object.keys(insight.device_breakdown).forEach(device => {
          const value = insight.device_breakdown[device];
          const existingDevice = acc.find(device => device.name === device);
          if (existingDevice) {
            existingDevice.value += value;
          } else {
            acc.push({ name: device, value });
          }
        });
      }
      return acc;
    }, []);

    setDeviceData(deviceTypes);
  };

  /**
   * Process platform data from API insights
   */
  const processPlatformData = (insights) => {
    // Platforms
    const platforms = insights.reduce((acc, insight) => {
      if (insight.platform_breakdown) {
        Object.keys(insight.platform_breakdown).forEach(platform => {
          const value = insight.platform_breakdown[platform];
          const existingPlatform = acc.find(platform => platform.name === platform);
          if (existingPlatform) {
            existingPlatform.value += value;
          } else {
            acc.push({ name: platform, value });
          }
        });
      }
      return acc;
    }, []);

    setPlatformData(platforms);
  };

  /**
   * Simulate demographic data
   * In a real implementation, this would be replaced with actual Meta Ads demographic data
   */
  const generateSimulatedDemographicData = () => {
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
   * Simulate device data
   * In a real implementation, this would be replaced with actual Meta Ads device data
   */
  const generateSimulatedDeviceData = () => {
    // Device types
    const deviceTypes = [
      { name: 'Mobile', value: 65 + Math.random() * 15 },
      { name: 'Desktop', value: 25 + Math.random() * 15 },
      { name: 'Tablet', value: 5 + Math.random() * 5 }
    ];
    
    setDeviceData(deviceTypes);
  };

  /**
   * Simulate platform data
   * In a real implementation, this would be replaced with actual Meta Ads platform data
   */
  const generateSimulatedPlatformData = () => {
    // Platforms
    const platforms = [
      { name: 'Facebook', value: 45 + Math.random() * 15 },
      { name: 'Instagram', value: 35 + Math.random() * 15 },
      { name: 'Audience Network', value: 10 + Math.random() * 10 },
      { name: 'Messenger', value: 5 + Math.random() * 5 }
    ];
    
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
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Indicador de dados simulados */}
          {insights && insights.length > 0 && insights[0].campaign_name && insights[0].campaign_name.includes('simulado') && (
            <Typography variant="body2" color="warning.main" sx={{ mb: 2, fontStyle: 'italic' }}>
              * Os dados demográficos exibidos são simulados devido a problemas de comunicação com a API do Meta Ads
            </Typography>
          )}
          
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
        </>
      )}
    </Box>
  );
};

export default AudienceInsights;

import React, { useState, useEffect } from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Box, 
  Typography, 
  CircularProgress,
  Alert
} from '@mui/material';
import api from '../services/api';

const GoogleAnalyticsSelector = ({ onPropertySelect }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get('/integrations/google-analytics/properties');
      
      if (response.data && response.data.length > 0) {
        setProperties(response.data);
        
        // Auto-selecionar a primeira propriedade
        setSelectedProperty(response.data[0].property_id);
        if (onPropertySelect) {
          onPropertySelect(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching GA properties:', error);
      setError('Falha ao carregar propriedades do Google Analytics');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = (event) => {
    const propertyId = event.target.value;
    setSelectedProperty(propertyId);
    
    const selectedProp = properties.find(p => p.property_id === propertyId);
    if (selectedProp && onPropertySelect) {
      onPropertySelect(selectedProp);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (properties.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
        Nenhuma propriedade do Google Analytics encontrada. Por favor, conecte sua conta primeiro.
      </Typography>
    );
  }

  return (
    <Box sx={{ my: 2 }}>
      <FormControl fullWidth>
        <InputLabel id="ga-property-label">Propriedade do Google Analytics</InputLabel>
        <Select
          labelId="ga-property-label"
          value={selectedProperty}
          onChange={handlePropertyChange}
          label="Propriedade do Google Analytics"
        >
          {properties.map((property) => (
            <MenuItem 
              key={property.property_id} 
              value={property.property_id}
            >
              {property.property_name} ({property.account_name})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default GoogleAnalyticsSelector;

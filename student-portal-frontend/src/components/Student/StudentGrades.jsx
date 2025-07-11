import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Button
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { studentAPI } from '../../services/api';
import GradeFilters from './GradeFilters';
import GradeTable from './GradeTable';
import Loading from '../common/Loading';

const StudentGrades = () => {
  const [gradesData, setGradesData] = useState(null);
  const [filteredGrades, setFilteredGrades] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    year: '',
    sessionType: '',
    session: ''
  });
  const [availableYears, setAvailableYears] = useState([]);
  const [hasArabicNames, setHasArabicNames] = useState(false);
  const { t } = useTranslation();

  const fetchGrades = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await studentAPI.getGrades();
      setGradesData(response.grades);
      setHasArabicNames(response.has_arabic_names);
      
      // Extract available years
      const years = Object.keys(response.grades || {})
        .map(year => parseInt(year))
        .sort((a, b) => b - a);
      setAvailableYears(years);
      
      // Apply initial filters
      applyFilters(response.grades, filters);
      
    } catch (err) {
      setError(err.response?.data?.error || 'فشل في تحميل النقط');
      console.error('Error fetching grades:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (grades, currentFilters) => {
    if (!grades) {
      setFilteredGrades(null);
      return;
    }

    let filtered = { ...grades };

    // Filter by year
    if (currentFilters.year) {
      filtered = {
        [currentFilters.year]: filtered[currentFilters.year] || {}
      };
    }

    // Filter by session type and session number
    const processedFiltered = {};
    
    Object.entries(filtered).forEach(([year, yearData]) => {
      Object.entries(yearData).forEach(([sessionNum, sessionData]) => {
        // Filter by session number (1 or 2)
        if (currentFilters.session && sessionNum !== currentFilters.session) {
          return;
        }

        Object.entries(sessionData).forEach(([sessionType, sessionTypeData]) => {
          // Filter by session type (automne/printemps)
          if (currentFilters.sessionType && sessionType !== currentFilters.sessionType) {
            return;
          }

          // Initialize structure
          if (!processedFiltered[year]) processedFiltered[year] = {};
          if (!processedFiltered[year][sessionNum]) processedFiltered[year][sessionNum] = {};
          if (!processedFiltered[year][sessionNum][sessionType]) {
            processedFiltered[year][sessionNum][sessionType] = sessionTypeData;
          }
        });
      });
    });

    setFilteredGrades(processedFiltered);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    applyFilters(gradesData, newFilters);
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  const hasActiveFilters = filters.year || filters.sessionType || filters.session;
  const hasFilteredResults = filteredGrades && Object.keys(filteredGrades).length > 0;

  if (isLoading) {
    return <Loading message="جاري تحميل النقط... Loading grades..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SchoolIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" fontWeight="600" color="primary">
          {t('gradesTitle')}
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchGrades}
          sx={{ ml: 'auto' }}
          variant="outlined"
        >
          {t('refresh')}
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <GradeFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableYears={availableYears}
      />

      {/* Instructions */}
   

      {/* No Results Message */}
      {hasActiveFilters && !hasFilteredResults && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('noGrades')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            لا توجد نقط متاحة للفلاتر المختارة. جرب تغيير الفلاتر.
          </Typography>
        </Paper>
      )}

      {/* Grades Display */}
      {hasFilteredResults && (
        <Box>
          {/* Results Summary */}
      

          {/* Grades Table */}
          <GradeTable 
            gradesData={filteredGrades} 
            hasArabicNames={hasArabicNames}
          />
        </Box>
      )}

      {/* Footer Info */}
 
    </Box>
  );
};

export default StudentGrades;
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Typography,
  Button,
  Stack
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const GradeFilters = ({ filters, onFiltersChange, availableYears = [] }) => {
  const { t } = useTranslation();

  const handleFilterChange = (filterName, value) => {
    onFiltersChange({
      ...filters,
      [filterName]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      year: '',
      sessionType: '',
      session: ''
    });
  };

  const hasActiveFilters = filters.year || filters.sessionType || filters.session;

  return (
    <Card sx={{ mb: 3, borderRadius: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <FilterIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight="600">
             Filtrer les notes
          </Typography>
          {hasActiveFilters && (
            <Button
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              sx={{ ml: 'auto' }}
              color="secondary"
            >
             Effacer les filtres
            </Button>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Academic Year Filter */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel>{t('filterByYear')}</InputLabel>
              <Select
                value={filters.year || ''}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                label={t('filterByYear')}
              >
                <MenuItem value="">
                  <em>{t('allYears')}</em>
                </MenuItem>
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year} - {parseInt(year) + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Session Type Filter */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel>{t('sessionType')}</InputLabel>
              <Select
                value={filters.sessionType || ''}
                onChange={(e) => handleFilterChange('sessionType', e.target.value)}
                label={t('sessionType')}
              >
                <MenuItem value="">
                  <em>جميع الأنواع - All Types</em>
                </MenuItem>
                <MenuItem value="automne">
                  🍂 {t('autumnSession')} (S1, S3, S5)
                </MenuItem>
                <MenuItem value="printemps">
                  🌸 {t('springSession')} (S2, S4, S6)
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Session Filter */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel>الدورة - Session</InputLabel>
              <Select
                value={filters.session || ''}
                onChange={(e) => handleFilterChange('session', e.target.value)}
                label="الدورة - Session"
              >
                <MenuItem value="">
                  <em>{t('allSessions')}</em>
                </MenuItem>
                <MenuItem value="1">
                  📚 {t('normalSession')}
                </MenuItem>
                <MenuItem value="2">
                  🔄 {t('catchupSession')}
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
             Filtres actifs:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {filters.year && (
                <Chip
                  icon={<SchoolIcon />}
                  label={`السنة: ${filters.year}`}
                  onDelete={() => handleFilterChange('year', '')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {filters.sessionType && (
                <Chip
                  label={`النوع: ${filters.sessionType === 'automne' ? 'خريفية' : 'ربيعية'}`}
                  onDelete={() => handleFilterChange('sessionType', '')}
                  color="secondary"
                  variant="outlined"
                />
              )}
              {filters.session && (
                <Chip
                  label={`الدورة: ${filters.session === '1' ? 'عادية' : 'استدراكية'}`}
                  onDelete={() => handleFilterChange('session', '')}
                  color="info"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default GradeFilters;
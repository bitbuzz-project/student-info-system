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

  // Helper function to flatten the nested grades structure
  const flattenGrades = (grades) => {
    const flatList = [];
    if (!grades) return flatList;

    Object.entries(grades).forEach(([studyYear, yearData]) => {
      Object.entries(yearData).forEach(([sessionNum, sessionData]) => {
        Object.entries(sessionData).forEach(([sessionType, sessionTypeData]) => {
          Object.entries(sessionTypeData).forEach(([academicYearLogical, academicYearGrades]) => {
            Object.entries(academicYearGrades).forEach(([semesterCode, semesterGrades]) => {
              semesterGrades.forEach(grade => {
                flatList.push({
                  ...grade,
                  study_year: studyYear,
                  session_number: sessionNum,      // '1' or '2' (Normal/Catch-up)
                  session_type: sessionType,       // 'automne' or 'printemps'
                  academic_year_logical: academicYearLogical, // Logical year (e.g., '1' for S1/S2)
                  semester_code: semesterCode      // 'S1', 'S2', etc.
                });
              });
            });
          });
        });
      });
    });
    return flatList;
  };

  // Helper function to re-nest grades for the GradeTable component
  const reNestGrades = (flatGrades) => {
    const nested = {};
    flatGrades.forEach(grade => {
      const { study_year, session_number, session_type, academic_year_logical, semester_code } = grade;
      if (!nested[study_year]) nested[study_year] = {};
      if (!nested[study_year][session_number]) nested[study_year][session_number] = {};
      if (!nested[study_year][session_number][session_type]) nested[study_year][session_number][session_type] = {};
      if (!nested[study_year][session_number][session_type][academic_year_logical]) nested[study_year][session_number][session_type][academic_year_logical] = {};
      if (!nested[study_year][session_number][session_type][academic_year_logical][semester_code]) nested[study_year][session_number][session_type][academic_year_logical][semester_code] = [];
      
      nested[study_year][session_number][session_type][academic_year_logical][semester_code].push(grade);
    });
    return nested;
  };


  const applyFilters = (grades, currentFilters) => {
    if (!grades) {
      setFilteredGrades(null);
      return;
    }

    const allFlatGrades = flattenGrades(grades);
    let workingGrades = [...allFlatGrades];

    // Apply main filters
    if (currentFilters.year) {
        workingGrades = workingGrades.filter(grade => grade.study_year === String(currentFilters.year));
    }
    if (currentFilters.sessionType) {
        workingGrades = workingGrades.filter(grade => grade.session_type === currentFilters.sessionType);
    }
    if (currentFilters.session) {
        workingGrades = workingGrades.filter(grade => grade.session_number === String(currentFilters.session));
    }

    // Implement Rattrapage logic: if Session 2 is selected, remove modules already passed in Session 1
    if (currentFilters.session === '2') {
        const session1GradesForComparison = allFlatGrades.filter(g =>
            g.study_year === String(currentFilters.year) &&
            g.session_type === currentFilters.sessionType &&
            g.session_number === '1'
        );

        const passedModulesInSession1 = new Set(); // Stores unique module identifiers for passed grades
        session1GradesForComparison.forEach(grade => {
            // Check for passing grade (>=10) or validated status ('V')
            if ((grade.not_elp !== null && parseFloat(grade.not_elp) >= 10) || grade.cod_tre === 'V') {
                // Use a unique key for the module: academic year + semester code + module code
                const moduleIdentifier = `${grade.study_year}-${grade.semester_code}-${grade.cod_elp}`;
                passedModulesInSession1.add(moduleIdentifier);
            }
        });

        // Filter out grades from Session 2 that correspond to modules passed in Session 1
        workingGrades = workingGrades.filter(grade => {
            const moduleIdentifier = `${grade.study_year}-${grade.semester_code}-${grade.cod_elp}`;
            return !passedModulesInSession1.has(moduleIdentifier);
        });
    }

    // Reorganize filtered grades back into the nested structure for GradeTable
    const reorganizedFilteredGrades = reNestGrades(workingGrades);

    setFilteredGrades(reorganizedFilteredGrades);
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
      <Paper sx={{ p: 3, mt: 3, borderRadius: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          💡 ملاحظة: جميع النقط والحالات معروضة كما هي مسجلة في قاعدة البيانات الأصلية بدون أي تعديل أو إضافة من الواجهة.<br/>
          Note: All grades and statuses are displayed exactly as recorded in the original database without any modification or addition from the interface.
        </Typography>
      </Paper>
    </Box>
  );
};

export default StudentGrades;
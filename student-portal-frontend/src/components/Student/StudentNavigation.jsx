import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Person as PersonIcon,
  Grade as GradeIcon,
  BarChart as StatsIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const StudentNavigation = ({ currentTab, onTabChange }) => {
  const { t } = useTranslation();

  const handleChange = (event, newValue) => {
    onTabChange(newValue);
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        mb: 3, 
        borderRadius: 3,
        overflow: 'hidden'
      }}
    >
      <Tabs
        value={currentTab}
        onChange={handleChange}
        variant="fullWidth"
        sx={{
          '& .MuiTab-root': {
            minHeight: 60,
            fontWeight: 600,
            fontSize: '1rem',
            '&.Mui-selected': {
              background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              color: 'white'
            }
          },
          '& .MuiTabs-indicator': {
            display: 'none'
          }
        }}
      >
        <Tab
          icon={<PersonIcon />}
          iconPosition="start"
          label={t('personalInfo')}
          value="profile"
          sx={{
            '&:hover': {
              background: 'rgba(52, 152, 219, 0.1)'
            }
          }}
        />
        <Tab
          icon={<GradeIcon />}
          iconPosition="start"
          label={t('grades')}
          value="grades"
          sx={{
            '&:hover': {
              background: 'rgba(52, 152, 219, 0.1)'
            }
          }}
        />
        <Tab
          icon={<StatsIcon />}
          iconPosition="start"
          label={t('gradeStats')}
          value="stats"
          sx={{
            '&:hover': {
              background: 'rgba(52, 152, 219, 0.1)'
            }
          }}
        />
      </Tabs>
    </Paper>
  );
};

export default StudentNavigation;
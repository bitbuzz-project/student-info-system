import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  ar: {
    translation: {
      // Common
      'loading': 'جاري التحميل...',
      'error': 'خطأ',
      'success': 'نجح',
      'login': 'تسجيل الدخول',
      'logout': 'تسجيل الخروج',
      'cancel': 'إلغاء',
      'save': 'حفظ',
      'close': 'إغلاق',
      
      // Login
      'welcome': 'مرحباً بك',
      'studentSystem': 'نظام معلومات الطلاب',
      'enterCin': 'أدخل رقم بطاقة التعريف الوطنية',
      'enterPassword': 'أدخل كلمة المرور',
      'cinLabel': 'رقم بطاقة التعريف الوطنية',
      'passwordLabel': 'كلمة المرور',
      'loginButton': 'تسجيل الدخول',
      'loginFailed': 'فشل تسجيل الدخول',
      'invalidCredentials': 'بيانات الدخول غير صحيحة',
      
      // Student Info
      'studentInfo': 'معلومات الطالب',
      'personalInfo': 'المعلومات الشخصية',
      'academicInfo': 'المعلومات الأكاديمية',
      'grades': 'النقط',
      'studentCode': 'رقم الطالب',
      'fullName': 'الاسم الكامل',
      'arabicName': 'الاسم بالعربية',
      'cin': 'رقم بطاقة التعريف',
      'dateOfBirth': 'تاريخ الميلاد',
      'placeOfBirth': 'مكان الميلاد',
      'gender': 'الجنس',
      'specialization': 'التخصص',
      'academicYear': 'السنة الجامعية',
      'diploma': 'الدبلوم',
      
      // Grades
      'gradesTitle': 'النقط التفصيلية',
      'gradeStats': 'إحصائيات النقط',
      'filterByYear': 'تصفية حسب السنة',
      'filterBySession': 'تصفية حسب الدورة',
      'allYears': 'جميع السنوات',
      'allSessions': 'جميع الدورات',
      'sessionType': 'نوع الدورة',
      'autumnSession': 'الدورة الخريفية',
      'springSession': 'الدورة الربيعية',
      'normalSession': 'دورة عادية',
      'catchupSession': 'دورة الاستدراكية',
      'semester': 'الفصل',
      'subject': 'المادة',
      'grade': 'النقطة',
      'result': 'النتيجة',
      'type': 'النوع',
      'module': 'وحدة',
      'passed': 'نجح',
      'failed': 'رسب',
      'absent': 'غائب',
      'total': 'إجمالي',
      'average': 'المعدل',
      'noGrades': 'لا توجد نقط متاحة',
      'selectFilters': 'اختر الفلاتر لعرض النقط',
      
      // Additional Profile translations
      'lastUpdate': 'آخر تحديث',
      'noData': 'لا توجد بيانات متاحة',
      'refresh': 'تحديث',
      'male': 'ذكر',
      'female': 'أنثى',
      'cycleInscriptions': 'تسجيلات الدورة',
      'stageInscriptions': 'تسجيلات المرحلة',
      'diplomaInscriptions': 'تسجيلات الدبلوم',
      'additionalInfo': 'معلومات إضافية'
    }
  },
  fr: {
    translation: {
      // Common
      'loading': 'Chargement...',
      'error': 'Erreur',
      'success': 'Succès',
      'login': 'Connexion',
      'logout': 'Déconnexion',
      'cancel': 'Annuler',
      'save': 'Enregistrer',
      'close': 'Fermer',
      
      // Login
      'welcome': 'Bienvenue',
      'studentSystem': 'Système d\'Information des Étudiants',
      'enterCin': 'Entrez votre numéro CIN',
      'enterPassword': 'Entrez votre mot de passe',
      'cinLabel': 'Numéro CIN',
      'passwordLabel': 'Mot de passe',
      'loginButton': 'Se connecter',
      'loginFailed': 'Échec de la connexion',
      'invalidCredentials': 'Identifiants invalides',
      
      // Student Info
      'studentInfo': 'Informations Étudiant',
      'personalInfo': 'Informations Personnelles',
      'academicInfo': 'Informations Académiques',
      'grades': 'Notes',
      'studentCode': 'Code Étudiant',
      'fullName': 'Nom Complet',
      'arabicName': 'Nom en Arabe',
      'cin': 'CIN',
      'dateOfBirth': 'Date de Naissance',
      'placeOfBirth': 'Lieu de Naissance',
      'gender': 'Sexe',
      'specialization': 'Spécialisation',
      'academicYear': 'Année Universitaire',
      'diploma': 'Diplôme',
      
      // Grades
      'gradesTitle': 'Notes Détaillées',
      'gradeStats': 'Statistiques des Notes',
      'filterByYear': 'Filtrer par Année',
      'filterBySession': 'Filtrer par Session',
      'allYears': 'Toutes les Années',
      'allSessions': 'Toutes les Sessions',
      'sessionType': 'Type de Session',
      'autumnSession': 'Session d\'Automne',
      'springSession': 'Session de Printemps',
      'normalSession': 'Session Normale',
      'catchupSession': 'Session de Rattrapage',
      'semester': 'Semestre',
      'subject': 'Matière',
      'grade': 'Note',
      'result': 'Résultat',
      'type': 'Type',
      'module': 'Module',
      'passed': 'Réussi',
      'failed': 'Échoué',
      'absent': 'Absent',
      'total': 'Total',
      'average': 'Moyenne',
      'noGrades': 'Aucune note disponible',
      'selectFilters': 'Sélectionnez les filtres pour afficher les notes',
      
      // Additional Profile translations
      'lastUpdate': 'Dernière mise à jour',
      'noData': 'Aucune donnée disponible',
      'refresh': 'Actualiser',
      'male': 'Masculin',
      'female': 'Féminin',
      'cycleInscriptions': 'Inscriptions cycle',
      'stageInscriptions': 'Inscriptions étape',
      'diplomaInscriptions': 'Inscriptions diplôme',
      'additionalInfo': 'Informations supplémentaires'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar', // Default language
    fallbackLng: 'fr',
    
    interpolation: {
      escapeValue: false // React already does escaping
    },
    
    react: {
      useSuspense: false
    }
  });

export default i18n;
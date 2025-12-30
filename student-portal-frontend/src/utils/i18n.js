// src/utils/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ar: {
    translation: {
      // Common
      'dashboard': 'الرئيسية',
      'Profile': 'ملفي الشخصي',
      'loading': 'جاري التحميل...',
      'error': 'خطأ',
      'success': 'نجح',
      'login': 'تسجيل الدخول',
      'logout': 'تسجيل الخروج',
      'cancel': 'إلغاء',
      'save': 'حفظ',
      'close': 'إغلاق',

      // Sidebar Navigation
      'administrativeSituation': 'الوضعية الإدارية',
      'pedagogicalSituation': 'الوضعية البيداغوجية',
      'officialDocuments': 'كشوفات النقط',
      'gradesAndResults': 'النقط والنتائج',
      'statistics': 'الاحصائيات',
      'requestsAndComplaints': 'الشكايات والطلبات',

      // Dashboard Home
      'goodMorning': 'صباح الخير',
      'goodAfternoon': 'مساء الخير',
      'goodEvening': 'مساء الخير',
      'welcomeMessageBody': 'مرحباً بك في تطبيق وضعيتي – المنصة الخاصة بطلبة كلية العلوم القانونية والسياسية بسطات. يمكنك من خلاله الاطلاع على وضعيتك الجامعية، نقاطك، وتتبع مسارك الجامعي بكل سهولة وفي أي وقت.',
      
      // Quick Actions (Home Page)
      'myProfile': 'بياناتي',
      'viewPersonalInfo': 'عرض معلوماتك الشخصية والجامعية',
      'viewModules': 'عرض الوحدات والمواد المسجل بها حسب السنة',
      'viewAdminReg': 'عرض التسجيل الإداري عبر السنوات الجامعية',
      'myGrades': 'نقطي',
      'viewAllGrades': 'عرض جميع نقطك مفصلة حسب السنوات',
      'timeSchedule': 'البرمجة الزمنية',
      'viewSchedule': 'عرض البرمجة الزمنية الخاصة بالدورة',
      
      // Info Summary
      'infoSummary': 'ملخص المعلومات',
      'N Apogee': 'رقم الطالب "أبوجي"',
      'specialization': 'التخصص',
      'cinLabel': 'رقم بطاقة التعريف - CIN',
      'lastUpdate': 'آخر تحديث',
      'studentSystem': 'منصة وضعيتي',

      // Grades
      'gradesTitle': 'النتائج',
      'gradeStats': 'إحصائيات النقط',
      'filterByYear': 'حسب السنة',
      'filterBySession': 'حسب الدورة',
      'allYears': 'جميع السنوات',
      'allSessions': 'جميع الدورات',
      'sessionType': 'حسب الدورة',
      'autumnSession': 'الدورة الخريفية',
      'springSession': 'الدورة الربيعية',
      'normalSession': 'دورة عادية',
      'catchupSession': 'دورة الاستدراكية',
      'semester': 'السداسي',
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
      'noData': 'لا توجد بيانات متاحة',
      'refresh': 'تحديث',
      'male': 'ذكر',
      'female': 'أنثى',
      'cycleInscriptions': 'تسجيلات الدورة',
      'stageInscriptions': 'تسجيلات المرحلة',
      'diplomaInscriptions': 'تسجيلات الدبلوم',
      'additionalInfo': 'معلومات إضافية',

      // Login
      'welcome': 'مرحباً بك',
      'enterCin': 'أدخل رقم بطاقة التعريف الوطنية',
      'enterPassword': 'أدخل رقم أبوجي',
      'passwordLabel': 'كلمة المرور',
      'loginButton': 'تسجيل الدخول',
      'loginFailed': 'فشل تسجيل الدخول',
      'invalidCredentials': 'بيانات الدخول غير صحيحة',
      
      // Student Info
      'studentInfo': 'معلومات الطالب',
      'personalInfo': 'المعلومات الشخصية',
      'academicInfo': 'المعلومات الجامعية',
      'grades': 'النقط',
      'studentCode': 'رقم الطالب',
      'fullName': 'الاسم الكامل',
      'arabicName': 'الاسم بالعربية',
      'cin': 'رقم بطاقة التعريف',
      'dateOfBirth': 'تاريخ الميلاد',
      'placeOfBirth': 'مكان الميلاد',
      'gender': 'الجنس',
      'academicYear': 'السنة الجامعية',
      'diploma': 'الدبلوم',

      // Documents
      'transcripts': 'كشوف النقط',
      'generateTranscript': 'إنشاء كشف النقط',
      'selectSemester': 'اختر السداسي',
      'downloadTranscript': 'تحميل كشف النقط',
      'officialTranscript': 'كشف النقط الرسمي',
      'finalGrades': 'النقط النهائية',
      'currentGrades': 'النقط الحالية',
      'academicTranscript': 'كشف الدرجات الأكاديمي'
    }
  },
  fr: {
    translation: {
      // Common
      'dashboard': 'Tableau de bord',
      'Profile': 'Mon Profil',
      'loading': 'Chargement...',
      'error': 'Erreur',
      'success': 'Succès',
      'login': 'Connexion',
      'logout': 'Déconnexion',
      'cancel': 'Annuler',
      'save': 'Enregistrer',
      'close': 'Fermer',

      // Sidebar Navigation
      'administrativeSituation': 'Situation Administrative',
      'pedagogicalSituation': 'Situation Pédagogique',
      'officialDocuments': 'Documents Officiels',
      'gradesAndResults': 'Notes et Résultats',
      'statistics': 'Statistiques',
      'requestsAndComplaints': 'Demandes et Réclamations',

      // Dashboard Home
      'goodMorning': 'Bonjour',
      'goodAfternoon': 'Bon après-midi',
      'goodEvening': 'Bonsoir',
      'welcomeMessageBody': 'Bienvenue sur l\'application Wadiyati - La plateforme dédiée aux étudiants de la FSJES Settat. Vous pouvez consulter votre situation académique, vos notes et suivre votre parcours universitaire facilement et à tout moment.',

      // Quick Actions (Home Page)
      'myProfile': 'Mon Profil',
      'viewPersonalInfo': 'Consulter vos informations personnelles et académiques',
      'viewModules': 'Consulter les modules et matières inscrits par année',
      'viewAdminReg': 'Consulter l\'inscription administrative par année',
      'myGrades': 'Mes Notes',
      'viewAllGrades': 'Consulter toutes vos notes détaillées par année',
      'timeSchedule': 'Emploi du temps',
      'viewSchedule': 'Consulter l\'emploi du temps de la session',

      // Info Summary
      'infoSummary': 'Résumé des Informations',
      'N Apogee': 'Code Apogée',
      'specialization': 'Filière',
      'cinLabel': 'CIN',
      'lastUpdate': 'Dernière mise à jour',
      'studentSystem': 'Système d\'Information des Étudiants',

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
      'noData': 'Aucune donnée disponible',
      'refresh': 'Actualiser',
      'male': 'Masculin',
      'female': 'Féminin',
      'cycleInscriptions': 'Inscriptions cycle',
      'stageInscriptions': 'Inscriptions étape',
      'diplomaInscriptions': 'Inscriptions diplôme',
      'additionalInfo': 'Informations supplémentaires',

      // Login
      'welcome': 'Bienvenue',
      'enterCin': 'Entrez votre numéro CIN',
      'enterPassword': 'Entrez votre APOGEE',
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
      'academicYear': 'Année Universitaire',
      'diploma': 'Diplôme',

       // Documents
      'transcripts': 'Relevés de Notes',
      'generateTranscript': 'Générer Relevé de Notes',
      'selectSemester': 'Sélectionner le Semestre',
      'downloadTranscript': 'Télécharger Relevé de Notes',
      'officialTranscript': 'Relevé de Notes Officiel',
      'finalGrades': 'Notes Finales',
      'currentGrades': 'Notes Actuelles',
      'academicTranscript': 'Relevé Académique'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar',
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
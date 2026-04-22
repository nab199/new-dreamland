import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Student } from '../types';

const USAGE_ITEMS = [
  { code: 'LIB', label: 'Library Access' },
  { code: 'ENT', label: 'Campus Entry' },
  { code: 'EXM', label: 'Exam Verification' },
  { code: 'EVT', label: 'Campus Events' },
];

export default function DigitalIDScreen() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      if (user?.role === 'student') {
        const response = await apiService.getStudents();
        if (response.data && response.data.length > 0) {
          const studentData = response.data.find(
            (currentStudent: Student) => currentStudent.user_id === user.id
          );
          if (studentData) {
            setStudent(studentData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = () => {
    const currentStudentId = student?.id || user?.id || 0;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=STUDENT_${currentStudentId}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const fullName = student
    ? `${student.first_name} ${student.last_name}`
    : user?.full_name || 'N/A';
  const currentStudentId = student?.id || user?.id || 'N/A';
  const program = student?.program_degree || 'Not specified';
  const enrollmentYear = student?.enrollment_year || new Date().getFullYear();
  const validUntil = enrollmentYear + 4;
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Digital ID Card</Text>
        <Text style={styles.headerSubtitle}>Tap to flip | Valid student identification</Text>
      </View>

      <TouchableOpacity
        style={styles.cardContainer}
        onPress={() => setShowBack((current) => !current)}
        activeOpacity={0.9}
      >
        {!showBack ? (
          <View style={[styles.card, styles.cardFront]}>
            <View style={styles.cardHeader}>
              <Text style={styles.institutionName}>Dreamland College</Text>
              <Text style={styles.cardType}>STUDENT ID</Text>
            </View>

            <View style={styles.photoSection}>
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitials}>{initials || 'NA'}</Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{fullName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Student ID</Text>
                <Text style={styles.infoValue}>DL-{String(currentStudentId).padStart(6, '0')}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Program</Text>
                <Text style={styles.infoValue}>{program}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Valid Through</Text>
                <Text style={styles.infoValue}>{validUntil}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>This card is property of Dreamland College</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.card, styles.cardBack]}>
            <View style={styles.qrSection}>
              <View style={styles.qrCodeContainer}>
                <Image source={{ uri: generateQRCode() }} style={styles.qrCode} />
              </View>
              <Text style={styles.qrLabel}>Scan for verification</Text>
            </View>

            <View style={styles.backInfoSection}>
              <Text style={styles.backInfoLabel}>Emergency Contact</Text>
              <Text style={styles.backInfoValue}>+251-11-XXX-XXXX</Text>
              <Text style={styles.backInfoLabel}>Email</Text>
              <Text style={styles.backInfoValue}>
                {student?.email || user?.email || 'N/A'}
              </Text>
              <Text style={styles.backInfoLabel}>Phone</Text>
              <Text style={styles.backInfoValue}>{student?.phone || 'N/A'}</Text>
            </View>

            <View style={styles.termsSection}>
              <Text style={styles.termsText}>
                This ID card is non-transferable. If found, please return it to the
                Dreamland College Administration Office.
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>(c) 2026 Dreamland College</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.usageSection}>
        <Text style={styles.usageTitle}>Where to use your Digital ID</Text>
        <View style={styles.usageGrid}>
          {USAGE_ITEMS.map((item) => (
            <View key={item.code} style={styles.usageItem}>
              <Text style={styles.usageIcon}>{item.code}</Text>
              <Text style={styles.usageLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxTitle}>How to use</Text>
        <Text style={styles.infoBoxText}>
          - Tap the card to flip and show the QR code{'\n'}
          - Present the QR code for scanning at verification points{'\n'}
          - Keep your phone charged when visiting campus{'\n'}
          - Report lost devices immediately to administration
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#059669',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  cardContainer: {
    margin: 20,
    aspectRatio: 1.586,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  cardFront: {
    backgroundColor: '#FFFFFF',
  },
  cardBack: {
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    backgroundColor: '#059669',
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  institutionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardType: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
    letterSpacing: 2,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#059669',
  },
  photoInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
    paddingLeft: 12,
  },
  cardFooter: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#F9FAFB',
  },
  qrCodeContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#059669',
  },
  qrCode: {
    width: 150,
    height: 150,
  },
  qrLabel: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginTop: 12,
  },
  backInfoSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backInfoLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 12,
  },
  backInfoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  termsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  termsText: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  usageSection: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  usageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  usageItem: {
    width: '23%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  usageIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  usageLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  infoBox: {
    margin: 20,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#059669',
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 20,
  },
});

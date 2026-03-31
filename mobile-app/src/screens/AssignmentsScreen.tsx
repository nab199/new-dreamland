import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Assignment } from '../types';

export default function AssignmentsScreen() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    requestCameraPermission();
    loadAssignments();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(status === 'granted');
  };

  const loadAssignments = async () => {
    try {
      const response = await apiService.getAssignments();
      if (response.data) {
        setAssignments(response.data);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCamera = async () => {
    if (hasCameraPermission === false) {
      Alert.alert('Camera Permission Required', 'Please grant camera permission to submit assignments.');
      return;
    }
    setShowCamera(true);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library permission.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
    }
  };

  const handleTakePicture = (photo: ImagePicker.ImagePickerAsset) => {
    setCapturedImage(photo.uri);
    setShowCamera(false);
  };

  const submitAssignment = async () => {
    if (!selectedAssignment || !capturedImage) {
      Alert.alert('Error', 'Please select an assignment and capture an image.');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiService.submitAssignment(
        selectedAssignment.id,
        capturedImage,
        'image/jpeg'
      );

      Alert.alert('Success', 'Assignment submitted successfully!');
      setCapturedImage(null);
      setSelectedAssignment(null);
      loadAssignments();
    } catch (error: any) {
      Alert.alert('Submission Failed', error.message || 'Failed to submit assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (assignment: Assignment) => {
    if (assignment.submitted) return '#059669';
    if (new Date(assignment.due_date) < new Date()) return '#DC2626';
    return '#F59E0B';
  };

  const getStatusText = (assignment: Assignment) => {
    if (assignment.submitted) return 'Submitted';
    if (new Date(assignment.due_date) < new Date()) return 'Overdue';
    return 'Pending';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Assignments</Text>
          <Text style={styles.headerSubtitle}>
            {assignments.filter(a => !a.submitted).length} pending submissions
          </Text>
        </View>

        {assignments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No assignments found</Text>
          </View>
        ) : (
          assignments.map((assignment) => (
            <TouchableOpacity
              key={assignment.id}
              style={styles.assignmentCard}
              onPress={() => setSelectedAssignment(assignment)}
            >
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: getStatusColor(assignment) },
                ]}
              />
              <View style={styles.assignmentContent}>
                <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                <Text style={styles.assignmentDescription} numberOfLines={2}>
                  {assignment.description}
                </Text>
                <View style={styles.assignmentMeta}>
                  <Text style={styles.assignmentDue}>
                    📅 Due: {formatDate(assignment.due_date)}
                  </Text>
                  <Text
                    style={[
                      styles.assignmentStatus,
                      { color: getStatusColor(assignment) },
                    ]}
                  >
                    {getStatusText(assignment)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Submission Modal */}
      <Modal
        visible={!!selectedAssignment}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setSelectedAssignment(null);
          setCapturedImage(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Assignment</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedAssignment(null);
                  setCapturedImage(null);
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedAssignment && (
              <>
                <Text style={styles.modalAssignmentTitle}>
                  {selectedAssignment.title}
                </Text>

                {capturedImage ? (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: capturedImage }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setCapturedImage(null)}
                    >
                      <Text style={styles.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.captureOptions}>
                    <TouchableOpacity
                      style={styles.captureButton}
                      onPress={openCamera}
                    >
                      <Text style={styles.captureButtonText}>📷 Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.captureButton}
                      onPress={pickFromGallery}
                    >
                      <Text style={styles.captureButtonText}>🖼️ Choose from Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!capturedImage || isSubmitting) && styles.submitButtonDisabled,
                  ]}
                  onPress={submitAssignment}
                  disabled={!capturedImage || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Assignment</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Camera Modal */}
      <Modal visible={showCamera} animationType="slide" transparent={true}>
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraContainer}>
            {hasCameraPermission && (
              <Camera
                style={styles.camera}
                ratio="4:3"
                ref={(ref) => {
                  // Store camera reference if needed
                }}
              />
            )}
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setShowCamera(false)}
              >
                <Text style={styles.cameraButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.captureButtonLarge}
                onPress={async () => {
                  // In a real implementation, you'd use the camera ref to take a picture
                  // For now, we'll just close the camera
                  setShowCamera(false);
                  Alert.alert('Note', 'Camera capture would be implemented with expo-camera in production.');
                }}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={pickFromGallery}
              >
                <Text style={styles.cameraButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Camera component wrapper for taking pictures
function CameraView({ onPicture }: { onPicture: (photo: ImagePicker.ImagePickerAsset) => void }) {
  // This would be implemented with expo-camera in production
  return <View />;
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
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#059669',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
  emptyState: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  assignmentContent: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  assignmentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentDue: {
    fontSize: 12,
    color: '#6B7280',
  },
  assignmentStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalClose: {
    fontSize: 24,
    color: '#6B7280',
  },
  modalAssignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  imagePreview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeImageButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  removeImageText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  captureOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  captureButton: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#000',
  },
  cameraButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cameraButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  captureButtonLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
  },
});

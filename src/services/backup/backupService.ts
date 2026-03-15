import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BackupService {
  private backupDir: string;
  private dbPath: string;
  private maxBackups: number;

  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.dbPath = path.join(__dirname, '../../college.db');
    this.maxBackups = 30; // Keep last 30 backups

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a database backup
   */
  async createBackup(reason: string = 'scheduled'): Promise<{ success: boolean; backupPath?: string; error?: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `college_backup_${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupFilename);

      // Copy database file
      fs.copyFileSync(this.dbPath, backupPath);

      // Create metadata file
      const metadata = {
        backupDate: new Date().toISOString(),
        reason,
        originalSize: fs.statSync(this.dbPath).size,
        backupSize: fs.statSync(backupPath).size,
        checksum: this.calculateChecksum(backupPath)
      };

      fs.writeFileSync(
        path.join(this.backupDir, `${backupFilename}.meta.json`),
        JSON.stringify(metadata, null, 2)
      );

      // Cleanup old backups
      await this.cleanupOldBackups();

      console.log(`Backup created: ${backupFilename} (${reason})`);
      return { success: true, backupPath };
    } catch (error: any) {
      console.error('Backup failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(backupFilename: string): Promise<{ success: boolean; error?: string }> {
    try {
      const backupPath = path.join(this.backupDir, backupFilename);
      
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Backup file not found' };
      }

      // Create a pre-restore backup
      await this.createBackup('pre_restore');

      // Restore database
      fs.copyFileSync(backupPath, this.dbPath);

      console.log(`Database restored from: ${backupFilename}`);
      return { success: true };
    } catch (error: any) {
      console.error('Restore failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all available backups
   */
  listBackups(): any[] {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.endsWith('.db'))
        .sort()
        .reverse();

      return files.map(filename => {
        const metadataPath = path.join(this.backupDir, `${filename}.meta.json`);
        let metadata = null;
        
        if (fs.existsSync(metadataPath)) {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        }

        const stats = fs.statSync(path.join(this.backupDir, filename));

        return {
          filename,
          size: stats.size,
          createdAt: metadata?.backupDate || stats.birthtime,
          reason: metadata?.reason || 'unknown',
          checksum: metadata?.checksum
        };
      });
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Delete a specific backup
   */
  deleteBackup(filename: string): boolean {
    try {
      const backupPath = path.join(this.backupDir, filename);
      const metadataPath = path.join(this.backupDir, `${filename}.meta.json`);

      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }

      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete backup:', error);
      return false;
    }
  }

  /**
   * Cleanup old backups beyond maxBackups limit
   */
  private async cleanupOldBackups(): Promise<void> {
    const backups = this.listBackups();
    
    if (backups.length > this.maxBackups) {
      const toDelete = backups.slice(this.maxBackups);
      for (const backup of toDelete) {
        this.deleteBackup(backup.filename);
        console.log(`Deleted old backup: ${backup.filename}`);
      }
    }
  }

  /**
   * Calculate simple checksum (not cryptographically secure, just for integrity)
   */
  private calculateChecksum(filePath: string): string {
    const data = fs.readFileSync(filePath);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i];
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Export student data for GDPR compliance
   */
  exportStudentData(studentId: number, db: any): { success: boolean; data?: any; error?: string } {
    try {
      const student = db.prepare(`
        SELECT s.*, u.username, u.email, u.full_name, u.role, b.name as branch_name, p.name as program_name
        FROM students s
        JOIN users u ON s.user_id = u.id
        JOIN branches b ON s.branch_id = b.id
        LEFT JOIN programs p ON s.program_id = p.id
        WHERE s.id = ?
      `).get(studentId);

      if (!student) {
        return { success: false, error: 'Student not found' };
      }

      const enrollments = db.prepare(`
        SELECT e.*, c.code, c.title, sem.semester_name
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN semesters sem ON e.semester_id = sem.id
        WHERE e.student_id = ?
      `).all(studentId);

      const payments = db.prepare(`
        SELECT * FROM payments WHERE student_id = ?
      `).all(studentId);

      const attendance = db.prepare(`
        SELECT a.*, c.title as course_name
        FROM attendance a
        JOIN enrollments e ON a.enrollment_id = e.id
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ?
      `).all(studentId);

      const submissions = db.prepare(`
        SELECT sub.*, a.title as assignment_title
        FROM submissions sub
        JOIN assignments a ON sub.assignment_id = a.id
        WHERE sub.student_id = ?
      `).all(studentId);

      const exportData = {
        exportDate: new Date().toISOString(),
        student: {
          personalInfo: {
            id: student.id,
            studentIdCode: student.student_id_code,
            username: student.username,
            email: student.email,
            fullName: student.full_name,
            birthYear: student.birth_year,
            birthPlace: {
              region: student.birth_place_region,
              zone: student.birth_place_zone,
              woreda: student.birth_place_woreda,
              kebele: student.birth_place_kebele
            },
            contactPhone: student.contact_phone,
            emergencyContact: {
              name: student.emergency_contact_name,
              phone: student.emergency_contact_phone
            }
          },
          academicInfo: {
            branch: student.branch_name,
            program: student.program_name,
            programDegree: student.program_degree,
            studentType: student.student_type,
            academicStatus: student.academic_status,
            currentSemester: student.current_semester_id
          },
          documents: student.documents_json ? JSON.parse(student.documents_json) : {}
        },
        academicRecords: {
          enrollments,
          grades: enrollments.filter((e: any) => e.grade),
          attendance,
          submissions
        },
        financialRecords: {
          payments
        }
      };

      return { success: true, data: exportData };
    } catch (error: any) {
      console.error('Data export failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete student data for GDPR compliance (right to be forgotten)
   */
  deleteStudentData(studentId: number, db: any, userId: number): { success: boolean; error?: string } {
    try {
      const deleteTransaction = db.transaction(() => {
        // Delete related records first (foreign key constraints)
        db.prepare('DELETE FROM submissions WHERE student_id = ?').run(studentId);
        db.prepare('DELETE FROM attendance WHERE enrollment_id IN (SELECT id FROM enrollments WHERE student_id = ?)').run(studentId);
        db.prepare('DELETE FROM course_waitlist WHERE student_id = ?').run(studentId);
        db.prepare('DELETE FROM enrollments WHERE student_id = ?').run(studentId);
        db.prepare('DELETE FROM payments WHERE student_id = ?').run(studentId);
        db.prepare('DELETE FROM invoices WHERE student_id = ?').run(studentId);
        db.prepare('DELETE FROM students WHERE id = ?').run(studentId);
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      });

      deleteTransaction();
      return { success: true };
    } catch (error: any) {
      console.error('Data deletion failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export all data as JSON for backup
   */
  exportAllData(db: any): string {
    const tables = [
      'branches', 'users', 'students', 'programs', 'courses',
      'semesters', 'enrollments', 'payments', 'announcements',
      'academic_calendars', 'audit_logs', 'fee_structures',
      'attendance', 'scholarships', 'invoices'
    ];

    const exportData: any = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      tables: {}
    };

    for (const table of tables) {
      try {
        exportData.tables[table] = db.prepare(`SELECT * FROM ${table}`).all();
      } catch (error) {
        console.error(`Failed to export table ${table}:`, error);
        exportData.tables[table] = [];
      }
    }

    return JSON.stringify(exportData, null, 2);
  }
}

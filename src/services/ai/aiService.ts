import { GoogleGenAI } from "@google/genai";

interface StudentData {
  name: string;
  gpa: number;
  attendanceRate: number;
  assignmentGrades: number[];
  midtermGrade: number;
  studyHours?: number;
  previousFailures?: number;
}

interface GradePrediction {
  predictedGrade: string;
  confidence: number;
  riskFactors: string[];
  recommendations: string[];
}

interface ReportComment {
  comment: string;
  strengths: string[];
  areasForImprovement: string[];
}

export class AIService {
  private ai: GoogleGenAI;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  /**
   * Predict student's final grade based on current performance
   */
  async predictGrade(studentData: StudentData): Promise<GradePrediction> {
    const prompt = `
      Analyze this student's academic performance and predict their final grade:
      
      Student: ${studentData.name}
      Current GPA: ${studentData.gpa}
      Attendance Rate: ${studentData.attendanceRate}%
      Assignment Grades: ${studentData.assignmentGrades.join(', ')}%
      Midterm Grade: ${studentData.midtermGrade}%
      Weekly Study Hours: ${studentData.studyHours || 'Not specified'}
      Previous Course Failures: ${studentData.previousFailures || 0}
      
      Provide a response in this exact JSON format:
      {
        "predictedGrade": "A/B/C/D/F",
        "confidence": 0.0-1.0,
        "riskFactors": ["factor1", "factor2"],
        "recommendations": ["recommendation1", "recommendation2"]
      }
      
      Consider:
      - Attendance below 75% is a major risk factor
      - Assignment average below 70% indicates struggle
      - Previous failures increase risk
      - Study hours below 10/week is concerning
    `;

    try {
      const result = await this.ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: prompt,
      });

      const responseText = result.text || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const prediction: GradePrediction = JSON.parse(jsonMatch[0]);
        return prediction;
      }

      // Fallback to basic calculation
      return this.calculateBasicPrediction(studentData);
    } catch (error) {
      console.error("AI grade prediction failed:", error);
      return this.calculateBasicPrediction(studentData);
    }
  }

  /**
   * Fallback prediction without AI
   */
  private calculateBasicPrediction(studentData: StudentData): GradePrediction {
    const assignmentAvg = studentData.assignmentGrades.reduce((a, b) => a + b, 0) / studentData.assignmentGrades.length;
    const weightedScore = (assignmentAvg * 0.2) + (studentData.midtermGrade * 0.3) + (studentData.attendanceRate * 0.1);

    let predictedGrade = 'F';
    if (weightedScore >= 90) predictedGrade = 'A';
    else if (weightedScore >= 80) predictedGrade = 'B';
    else if (weightedScore >= 70) predictedGrade = 'C';
    else if (weightedScore >= 60) predictedGrade = 'D';

    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (studentData.attendanceRate < 75) {
      riskFactors.push("Low attendance rate");
      recommendations.push("Improve class attendance to at least 85%");
    }

    if (assignmentAvg < 70) {
      riskFactors.push("Below average assignment performance");
      recommendations.push("Seek tutoring or study group support");
    }

    if (studentData.previousFailures && studentData.previousFailures > 0) {
      riskFactors.push("History of course failures");
      recommendations.push("Meet with academic advisor for study strategies");
    }

    if (studentData.gpa < 2.5) {
      riskFactors.push("Low overall GPA");
      recommendations.push("Consider reducing course load next semester");
    }

    return {
      predictedGrade,
      confidence: 0.7,
      riskFactors,
      recommendations
    };
  }

  /**
   * Generate personalized report card comments
   */
  async generateReportComment(studentData: {
    name: string;
    subject: string;
    grade: string;
    strengths: string[];
    weaknesses: string[];
    attendanceRate: number;
    participationLevel: 'high' | 'medium' | 'low';
  }): Promise<ReportComment> {
    const prompt = `
      Write a personalized report card comment for a student:

      Student Name: ${studentData.name}
      Subject: ${studentData.subject}
      Final Grade: ${studentData.grade}
      Strengths: ${studentData.strengths.join(', ')}
      Areas for Improvement: ${studentData.weaknesses.join(', ')}
      Attendance: ${studentData.attendanceRate}%
      Class Participation: ${studentData.participationLevel}

      Provide a response in this exact JSON format:
      {
        "comment": "A warm, professional 3-4 sentence comment",
        "strengths": ["strength1", "strength2"],
        "areasForImprovement": ["improvement1", "improvement2"]
      }

      Make the comment encouraging but honest. Start with a positive observation,
      mention areas of growth, and end with an encouraging note.
    `;

    try {
      const result = await this.ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: prompt,
      });

      const responseText = result.text || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback
      return this.generateBasicComment(studentData);
    } catch (error) {
      console.error("AI report comment generation failed:", error);
      return this.generateBasicComment(studentData);
    }
  }

  /**
   * Fallback comment generation without AI
   */
  private generateBasicComment(studentData: any): ReportComment {
    const comment = `${studentData.name} has achieved a grade of ${studentData.grade} in ${studentData.subject}. ` +
      `${studentData.strengths.length > 0 ? `They have demonstrated strong skills in ${studentData.strengths.join(' and ')}. ` : ''}` +
      `${studentData.weaknesses.length > 0 ? `Focus areas for improvement include ${studentData.weaknesses.join(' and ')}. ` : ''}` +
      `${studentData.attendanceRate >= 90 ? 'Their excellent attendance has contributed to their success. ' : ''}` +
      `We look forward to seeing their continued growth.`;

    return {
      comment,
      strengths: studentData.strengths,
      areasForImprovement: studentData.weaknesses
    };
  }

  /**
   * Identify at-risk students based on multiple factors
   */
  async identifyAtRiskStudents(students: any[]): Promise<any[]> {
    const atRiskStudents: any[] = [];

    for (const student of students) {
      const riskScore = this.calculateRiskScore(student);

      if (riskScore >= 50) {
        atRiskStudents.push({
          ...student,
          riskScore,
          riskLevel: riskScore >= 80 ? 'HIGH' : 'MEDIUM',
          interventions: this.suggestInterventions(student, riskScore)
        });
      }
    }

    return atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(student: any): number {
    let score = 0;

    // Attendance factor (max 30 points)
    if (student.attendanceRate < 75) score += 30;
    else if (student.attendanceRate < 85) score += 15;

    // GPA factor (max 25 points)
    if (student.gpa < 2.0) score += 25;
    else if (student.gpa < 2.5) score += 12;

    // Grade factor (max 25 points)
    if (student.recentGrades?.some((g: string) => g === 'F')) score += 25;
    else if (student.recentGrades?.some((g: string) => g === 'D')) score += 12;

    // Financial factor (max 20 points)
    if (!student.financialClearance) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Suggest interventions based on risk factors
   */
  private suggestInterventions(student: any, riskScore: number): string[] {
    const interventions: string[] = [];

    if (student.attendanceRate < 75) {
      interventions.push("Schedule attendance counseling session");
      interventions.push("Assign academic mentor for daily check-ins");
    }

    if (student.gpa < 2.5) {
      interventions.push("Refer to tutoring center");
      interventions.push("Consider course load reduction");
    }

    if (!student.financialClearance) {
      interventions.push("Connect with financial aid office");
      interventions.push("Explore payment plan options");
    }

    if (riskScore >= 80) {
      interventions.push("Immediate academic advisor intervention required");
      interventions.push("Schedule parent/guardian meeting");
    }

    return interventions;
  }

  /**
   * Chatbot response for student queries
   */
  async chatbotResponse(query: string, context?: {
    role?: string;
    studentInfo?: any;
    faqDatabase?: any[];
  }): Promise<string> {
    const prompt = `
      You are a helpful assistant for Dreamland College Management System.

      User Query: ${query}
      User Role: ${context?.role || 'student'}

      Provide helpful, accurate information about:
      - Checking grades and transcripts
      - Course registration process
      - Payment and fees
      - Attendance policies
      - Academic calendar and deadlines
      - Contact information for departments

      Keep responses concise (2-4 sentences), friendly, and professional.
      If you don't know the answer, suggest contacting the registrar office.
    `;

    try {
      const result = await this.ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: prompt,
      });

      return result.text || "I'm unable to process your request. Please contact the registrar office for assistance.";
    } catch (error) {
      console.error("AI chatbot failed:", error);
      return "I'm experiencing technical difficulties. Please contact the registrar office at support@dreamland.edu for assistance.";
    }
  }

  /**
   * Generate study tips based on learning patterns
   */
  async generateStudyTips(studentData: {
    learningStyle?: 'visual' | 'auditory' | 'kinesthetic';
    weakSubjects: string[];
    availableHours: number;
  }): Promise<string[]> {
    const prompt = `
      Generate personalized study tips for a student:

      Learning Style: ${studentData.learningStyle || 'not specified'}
      Challenging Subjects: ${studentData.weakSubjects.join(', ')}
      Available Study Hours per Week: ${studentData.availableHours}

      Provide 5-7 specific, actionable study tips tailored to their learning style and challenges.
      Return as a JSON array of strings.
    `;

    try {
      const result = await this.ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: prompt,
      });

      const responseText = result.text || "";
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return this.getGenericStudyTips();
    } catch (error) {
      console.error("AI study tips failed:", error);
      return this.getGenericStudyTips();
    }
  }

  private getGenericStudyTips(): string[] {
    return [
      "Create a consistent study schedule and stick to it",
      "Break study sessions into 25-30 minute focused blocks (Pomodoro technique)",
      "Review lecture notes within 24 hours of class",
      "Form or join a study group for collaborative learning",
      "Practice active recall instead of passive re-reading",
      "Use flashcards for memorization-heavy subjects",
      "Teach concepts to others to reinforce understanding"
    ];
  }
}

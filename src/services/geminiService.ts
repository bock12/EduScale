import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async gradeSubmission(rubric: string, submission: string) {
    const model = "gemini-3-flash-preview";
    const prompt = `
      You are an expert academic grader. 
      Grade the following student submission based on the provided rubric.
      Provide a score and detailed feedback.
      
      Rubric:
      ${rubric}
      
      Submission:
      ${submission}
      
      Return the result in JSON format with fields: score, feedback, and strengths/weaknesses.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  },

  async generateTimetable(constraints: string) {
    const model = "gemini-3-flash-preview";
    const prompt = `
      You are an expert school scheduler.
      Generate an optimized school timetable based on these constraints:
      ${constraints}
      
      Ensure no teacher or room conflicts.
      Return the timetable as a structured JSON object.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  },

  async predictPerformance(studentData: string) {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Analyze the following student performance data and predict future outcomes.
      Identify risks of dropout or failure.
      
      Data:
      ${studentData}
      
      Return a risk score (0-100) and specific intervention recommendations in JSON format.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  }
};

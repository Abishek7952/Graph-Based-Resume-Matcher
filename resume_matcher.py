import os
import google.generativeai as genai
import fitz  # PyMuPDF

# 🔐 IMPORTANT: Your Google AI API Key
# 1. Go to https://aistudio.google.com/app/apikey
# 2. Create and copy your API key.
# 3. Paste it here.
GOOGLE_API_KEY = "AIzaSyDCf69fCPciFRtS03L_BK_nRXxhzJ-2058"

# 📄 Path to your resume file
PDF_FILE_PATH = "M VISHAL - RESUME.pdf"

def parse_resume_with_ai():
    """
    Parses a resume from a local PDF file using PyMuPDF to extract text
    and the Google Gemini API to parse the structured data.
    """
    if GOOGLE_API_KEY == "YOUR_GOOGLE_API_KEY":
        print("❌ Error: Please add your Google API Key to the script.")
        return

    if not os.path.exists(PDF_FILE_PATH):
        print(f"❌ Error: File not found at '{PDF_FILE_PATH}'")
        return

    print("📄 Extracting text from resume PDF...")
    try:
        # Use PyMuPDF (fitz) to open the document
        doc = fitz.open(PDF_FILE_PATH)
        raw_text = ""
        for page in doc:
            raw_text += page.get_text()
        doc.close()

        if not raw_text.strip():
            print("⚠️ Could not extract any text. The PDF might be an image.")
            return

    except Exception as e:
        print(f"❌ Failed to extract text from PDF: {e}")
        return

    print("🤖 Sending text to Gemini AI for parsing...")
    try:
        # Configure the Gemini API client
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Create a detailed prompt for the AI to extract more fields
        prompt = f"""
        Act as an expert resume parser. Analyze the following raw text from a resume and extract a detailed, structured summary.

        Please extract the following fields:
        - Name
        - Email
        - Phone Number
        - Skills (as a comma-separated list)
        - Work Experience (list each job with title, company, and dates)
        - Projects (list each project with its name and a brief description)
        - Summary (a brief professional summary)

        Resume Text:
        ---
        {raw_text}
        ---

        Please format the output clearly with each field on a new line. For example:

        Name: Jane Doe
        Email: jane.doe@example.com
        Phone: (123) 456-7890
        Skills: Python, SQL, Data Analysis, Machine Learning
        Work Experience:
        - Data Scientist at Tech Corp (Jan 2022 - Present)
        - Junior Analyst at Data Inc (Jun 2020 - Dec 2021)
        Projects:
        - Customer Churn Prediction: Developed a model to predict customer churn with 95% accuracy.
        - Sales Forecasting Tool: Built a tool to forecast future sales using time series analysis.
        Summary: A highly motivated data scientist with 2 years of experience...
        """

        # Generate the content
        response = model.generate_content(prompt)
        
        print("✅ AI parsing complete!\n")
        print("===== Parsed Resume Summary =====")
        print(response.text)
        print("\n====================================")

    except Exception as e:
        print(f"❌ An error occurred with the Google AI API: {e}")


if __name__ == "__main__":
    parse_resume_with_ai()

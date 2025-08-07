import os
import json
import google.generativeai as genai
import fitz  # PyMuPDF
from Database_Storing import store_resume_data # Import the new storage function

# --- CONFIGURATION ---

#  IMPORTANT: Your Google AI API Key
#  https://aistudio.google.com/app/apikey
GOOGLE_API_KEY = "AIzaSyDCf69fCPciFRtS03L_BK_nRXxhzJ-2058"

#  Path to your resume file
PDF_FILE_PATH = "resume final one.pdf"


# --- MAIN PARSING LOGIC ---

def parse_and_store_resume():
    """
    Parses a resume using PyMuPDF and Gemini, then calls a separate
    module to store the data in MongoDB.
    """
    # --- Step 1: Pre-flight checks ---
    if GOOGLE_API_KEY == "YOUR_GOOGLE_API_KEY":
        print(" Error: Please add your Google API Key.")
        return
    if not os.path.exists(PDF_FILE_PATH):
        print(f" Error: File not found at '{PDF_FILE_PATH}'")
        return

    # --- Step 2: Extract text from PDF ---
    print(f" Extracting text from '{PDF_FILE_PATH}'...")
    try:
        doc = fitz.open(PDF_FILE_PATH)
        raw_text = "".join(page.get_text() for page in doc)
        doc.close()
        if not raw_text.strip():
            print(" Could not extract text. The PDF might be an image.")
            return
    except Exception as e:
        print(f" Failed to extract text from PDF: {e}")
        return

    # --- Step 3: Parse text with Gemini AI into JSON ---
    print(" Sending text to Gemini AI for JSON parsing...")
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Prompt requesting a clean JSON output
        prompt = f"""
        Act as an expert resume parser. Analyze the raw text below and convert it into a structured JSON object.
        The JSON object must contain these exact keys: "name", "email", "phone", "skills", "work_experience", "projects", "summary".
        - "skills" should be an array of strings.
        - "work_experience" should be an array of objects, each with "title", "company", and "dates".
        - "projects" should be an array of objects, each with "name" and "description".

        Do not include any text or markdown formatting before or after the JSON object.

        Resume Text:
        ---
        {raw_text}
        ---
        """
        response = model.generate_content(prompt)
        
        # Clean up the response to ensure it's valid JSON
        json_text = response.text.strip().replace("```json", "").replace("```", "")
        parsed_data = json.loads(json_text)
        print(" AI parsing successful.")

    except json.JSONDecodeError:
        print(" AI response was not valid JSON. Cannot store in database.")
        print("--- AI Response ---")
        print(response.text)
        print("-------------------")
        return
    except Exception as e:
        print(f" An error occurred with the Google AI API: {e}")
        return

    # --- Step 4: Call the storage function from the database module ---
    print(" Passing data to the storage module...")
    store_resume_data(parsed_data)


if __name__ == "__main__":
    parse_and_store_resume()

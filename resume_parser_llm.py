import os
import json
import google.generativeai as genai
import fitz  # PyMuPDF
from pymongo import MongoClient  #  MongoDB integration

# --- CONFIGURATION ---

GOOGLE_API_KEY =  os.environ.get("GEMINI_API_KEY")
PDF_FILE_PATH = r"D:\NOSql Project\Abishek resume.pdf"

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "ResumeDB"
COLLECTION_NAME = "resumes"

# --- MAIN LOGIC ---

def parse_and_store_resume():
    if GOOGLE_API_KEY == "YOUR_GOOGLE_API_KEY":
        print(" Error: Please add your Google API Key.")
        return

    if not os.path.exists(PDF_FILE_PATH):
        print(f" Error: File not found at '{PDF_FILE_PATH}'")
        return

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

    print(" Sending text to Gemini AI for JSON parsing...")
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel('gemini-2.5-flash')

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

        json_text = response.text.strip().replace("```json", "").replace("```", "")
        parsed_data = json.loads(json_text)
        print(" AI parsing successful.\n")

        #  Print the parsed data nicely
        print(" Parsed Resume JSON Output:")
        print(json.dumps(parsed_data, indent=4))


    except json.JSONDecodeError:
        print(" AI response was not valid JSON. Cannot store in database.")
        print("--- AI Response ---")
        print(response.text)
        print("-------------------")
        return
    except Exception as e:
        print(f" An error occurred with the Google AI API: {e}")
        return

    print(" Saving to MongoDB...")
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        result = collection.insert_one(parsed_data)
        print(f" Resume data stored with _id: {result.inserted_id}")
    except Exception as e:
        print(f" MongoDB Error: {e}")

if __name__ == "__main__":
    parse_and_store_resume()

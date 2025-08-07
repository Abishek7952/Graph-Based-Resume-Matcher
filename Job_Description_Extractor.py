import google.generativeai as genai
import os
import json
import sys
# Import the new storage function for job descriptions
from Database_Storing import store_job_description_data

GOOGLE_API_KEY = "AIzaSyDCf69fCPciFRtS03L_BK_nRXxhzJ-2058"
genai.configure(api_key=GOOGLE_API_KEY)

def extract_and_store_job_skills(job_description):
    """
    Analyzes a job description with Gemini, extracts skills, and
    stores the original description and the extracted skills in MongoDB.
    """
    prompt = f"""
    You are an expert career analyst. Your task is to analyze the following job description and extract a comprehensive list of skills required for the role.

    Please follow these rules:
    1.  List both technical and soft skills.
    2.  Include skills that are explicitly mentioned in the description.
    3.  Crucially, infer and include skills that are not explicitly mentioned but are logically necessary for a person to succeed in this role.
    4.  The output must be a JSON object with a single key "skills", which contains a list of strings. Do not include any other text or formatting.

    Job Description:
    ---
    {job_description}
    ---

    JSON Output:
    """

    model = genai.GenerativeModel('gemini-1.5-flash-latest')

    try:
        print(" Sending text to Gemini AI for JSON parsing...")
        response = model.generate_content(prompt)
        response_text = response.text.strip()

        start_index = response_text.find('{')
        end_index = response_text.rfind('}') + 1

        if start_index == -1 or end_index == -1:
            print(" Error: Could not find valid JSON in the response.")
            return

        json_string = response_text[start_index:end_index]
        parsed_json = json.loads(json_string)
        print(" AI parsing successful.")

        # --- Create the document to be stored ---
        # We store both the original description and the extracted skills
        storage_data = {
            "original_description": job_description,
            "extracted_skills": parsed_json.get("skills", [])
        }

        # --- Call the storage function from the database module ---
        print(" Passing data to the storage module...")
        store_job_description_data(storage_data)

    except json.JSONDecodeError:
        print(" AI response was not valid JSON. Cannot store in database.")
        print("--- AI Response ---")
        print(response.text)
        print("-------------------")
    except Exception as e:
        print(f" An error occurred: {e}")

# --- Main Execution ---
if __name__ == "__main__":
    print("Please paste the job description below. Press Ctrl+D (Linux/macOS) or Ctrl+Z + Enter (Windows) when you're done:\n")
    
    # Read multiline input from the user
    job_desc_input = sys.stdin.read()

    if job_desc_input:
        extract_and_store_job_skills(job_desc_input)
    else:
        print("No input received. Exiting.")
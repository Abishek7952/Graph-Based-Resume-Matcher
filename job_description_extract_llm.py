import google.generativeai as genai
import os
import json
import sys

# --- 1. Setup ---
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

def extract_skills_with_gemini(job_description):
    prompt = f"""
    You are an expert career analyst. Your task is to analyze the following job description and extract a comprehensive list of skills required for the role.

    Please follow these rules:
    1.  List both technical and soft skills.
    2.  Include skills that are explicitly mentioned in the description.
    3.  Crucially, infer and include skills that are not explicitly mentioned but are logically necessary for a person to succeed in this role. For example, a "Project Manager" role implies skills like "risk management" and "stakeholder communication". A "Software Engineer" role implies "debugging" and "code versioning".
    4.  The output must be a JSON object with a single key "skills", which contains a list of strings. Do not include any other text or formatting.

    Job Description:
    ---
    {job_description}
    ---

    JSON Output:
    """

    model = genai.GenerativeModel('gemini-1.5-flash-latest')

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()

        start_index = response_text.find('{')
        end_index = response_text.rfind('}') + 1

        if start_index == -1 or end_index == -1:
            print("Error: Could not find valid JSON in the response.")
            return []

        json_string = response_text[start_index:end_index]
        data = json.loads(json_string)
        return data.get("skills", [])

    except Exception as e:
        print(f"An error occurred: {e}")
        return []

# --- 2. Main Execution ---
if __name__ == "__main__":
    print("Please paste the job description below. Press Ctrl+D (Linux/macOS) or Ctrl+Z + Enter (Windows) when you're done:\n")
    
    # Read multiline input from the user
    job_desc_input = sys.stdin.read()

    print("\nExtracting skills from the job description...")
    extracted_skills = extract_skills_with_gemini(job_desc_input)

    if extracted_skills:
        print("\nExtracted Skills:")
        for skill in sorted(extracted_skills):
            print(f"- {skill}")
    else:
        print("\nNo skills could be extracted.")

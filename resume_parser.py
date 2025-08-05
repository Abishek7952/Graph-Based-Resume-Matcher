import fitz  # PyMuPDF
import google.generativeai as genai
import json
import time
import google.api_core.exceptions

# 1. Extract text from PDF
def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    return full_text.strip()

# 2. Configure Gemini API
def configure_gemini(api_key):
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("models/gemini-1.5-pro")  # Correct model name

# 3. Prepare and send prompt to Gemini with retries
def call_gemini_with_retries(text_chunk, model, max_retries=3, delay=60):
    prompt = f"""
You are a resume parsing assistant. From the following text, extract:
- Full Name
- Email Address
- Phone Number
- Top Skills (explicit or inferred)
- Work Experience Summary
- Projects
- Education

Output strictly in this JSON format:

{{
  "name": "...",
  "email": "...",
  "phone": "...",
  "skills": [...],
  "experience": "...",
  "projects": "...",
  "education": "..."
}}

Resume Chunk:
\"\"\"{text_chunk}\"\"\"
"""
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            return response.text
        except google.api_core.exceptions.ResourceExhausted as e:
            print(f"⚠️ Quota hit. Retrying in {delay} seconds...")
            time.sleep(delay)
        except Exception as e:
            print(f"❌ Error: {e}")
            break
    return None

# 4. Chunk long resumes to avoid token limits
def split_text_into_chunks(text, max_chars=4000):
    return [text[i:i+max_chars] for i in range(0, len(text), max_chars)]

# 5. Main
if __name__ == "__main__":
    RESUME_PDF_PATH = "M VISHAL - RESUME.pdf"  # Path to your resume
    GEMINI_API_KEY = "AIzaSyDpny6Zyi1JDfInFQdD58tD1V-KO0e4sPE"       # Replace with your real key

    print("📄 Extracting text from resume PDF...")
    resume_text = extract_text_from_pdf(RESUME_PDF_PATH)

    print("🔐 Connecting to Gemini Pro...")
    model = configure_gemini(GEMINI_API_KEY)

    chunks = split_text_into_chunks(resume_text)
    merged_data = {
        "name": "",
        "email": "",
        "phone": "",
        "skills": set(),
        "experience": "",
        "projects": "",
        "education": ""
    }

    print("🧠 Parsing each chunk with Gemini...")
    for i, chunk in enumerate(chunks):
        print(f"\n🔍 Processing chunk {i+1}/{len(chunks)}")
        result = call_gemini_with_retries(chunk, model)
        if not result:
            continue

        try:
            parsed = json.loads(result)
            if not merged_data["name"] and "name" in parsed:
                merged_data["name"] = parsed.get("name", "")
            if not merged_data["email"] and "email" in parsed:
                merged_data["email"] = parsed.get("email", "")
            if not merged_data["phone"] and "phone" in parsed:
                merged_data["phone"] = parsed.get("phone", "")

            if "skills" in parsed:
                merged_data["skills"].update([s.strip() for s in parsed["skills"]])
            if "experience" in parsed and parsed["experience"]:
                merged_data["experience"] += parsed["experience"] + "\n"
            if "projects" in parsed and parsed["projects"]:
                merged_data["projects"] += parsed["projects"] + "\n"
            if "education" in parsed and parsed["education"]:
                merged_data["education"] += parsed["education"] + "\n"

        except json.JSONDecodeError:
            print("⚠️ Could not parse JSON. Raw output:")
            print(result)

    print("\n✅ Final Parsed Resume Data:")
    merged_data["skills"] = list(merged_data["skills"])  # Convert set to list
    print(json.dumps(merged_data, indent=2))

import json
import fitz  # PyMuPDF
from llama_cpp import Llama

# ------------------- CONFIG --------------------
MODEL_PATH = "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"  # Update to your local model path
PDF_PATH = "D:/NOSql Project/Abishek resume.pdf"     # ✅ Your resume PDF path here
N_CTX = 5000  # Max context length
N_THREADS = 4  # CPU threads to use
# ------------------------------------------------

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    return full_text.strip()

def build_prompt(resume_text):
    return f"""
You are an intelligent resume parser. Extract the following information from the resume text:

- Full Name
- Email ID
- Phone Number
- Skills (as a list)
- Work Experience (as a list with the following fields for each entry):
  - Role
  - Summary (what they did in that role)
  - Time Period (e.g., "Jan 2020 – Dec 2022")
- List of Projects (each with title and a brief description)

Respond only in valid JSON format.

Resume:
\"\"\"{resume_text}\"\"\"

Respond only in valid JSON format.
"""

def run_llm(prompt):
    llm = Llama(
        model_path=MODEL_PATH,
        n_ctx=N_CTX,
        n_threads=N_THREADS,
        verbose=False
    )
    output = llm(prompt, max_tokens=800, stop=["\n\n"], echo=False)
    response_text = output["choices"][0]["text"]
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        print("⚠️ Failed to parse JSON. Output:\n", response_text)
        return None

def main():
    print(f"📄 Extracting text from: {PDF_PATH}")
    resume_text = extract_text_from_pdf(PDF_PATH)

    print("🧠 Running TinyLlama locally...")
    prompt = build_prompt(resume_text)
    result = run_llm(prompt)

    if result:
        print("✅ Parsed Resume:")
        print(json.dumps(result, indent=2))
    else:
        print("❌ Resume parsing failed.")

if __name__ == "__main__":
    main()

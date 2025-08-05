import fitz  # PyMuPDF
import pandas as pd
from sentence_transformers import SentenceTransformer, util
import torch
import re
import nltk
from nltk.tokenize import sent_tokenize

nltk.download("punkt")

# 1. Extract resume text
def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

# 2. Extract candidate info
def extract_contact_info(text):
    name = text.strip().split("\n")[0]
    email = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]+", text)
    phone = re.search(r"\+?\d[\d\s\-]{8,15}", text)
    return {
        "name": name.strip(),
        "email": email.group() if email else "Not found",
        "phone": phone.group().strip() if phone else "Not found",
    }

# 3. Focus on relevant content
def extract_relevant_sentences(text):
    sections = ["skills", "experience", "projects", "technical", "technologies", "summary"]
    lines = text.split("\n")
    relevant = []

    capture = False
    for line in lines:
        line_lower = line.strip().lower()
        if any(section in line_lower for section in sections):
            capture = True
            continue
        if capture:
            if line_lower == "" or re.match(r"^[a-z\s]{1,20}:$", line_lower):
                capture = False
            else:
                relevant.append(line.strip())

    if not relevant:
        relevant = sent_tokenize(text.lower())

    return list(set(relevant))

# 4. Load and deduplicate skill list semantically
def load_unique_skills(csv_path, model, similarity_threshold=0.9):
    df = pd.read_csv(csv_path)
    if 'skills' in df.columns:
        raw_skills = df['skills'].dropna().astype(str).str.lower().str.strip().tolist()
    else:
        raw_skills = df.iloc[:, 0].dropna().astype(str).str.lower().str.strip().tolist()

    embeddings = model.encode(raw_skills, convert_to_tensor=True)
    unique_skills, unique_embeddings = [], []

    for i, skill in enumerate(raw_skills):
        emb = embeddings[i]
        if all(util.cos_sim(emb, e)[0].item() < similarity_threshold for e in unique_embeddings):
            unique_skills.append(skill)
            unique_embeddings.append(emb)

    return unique_skills

# 5. Match relevant text semantically to skills
def match_skills(sentences, skills, model, threshold=0.55, top_k=15):
    skill_embeddings = model.encode(skills, convert_to_tensor=True)
    matched = {}

    for sentence in sentences:
        sentence_emb = model.encode(sentence, convert_to_tensor=True)
        scores = util.cos_sim(sentence_emb, skill_embeddings)[0]

        for idx, score in enumerate(scores):
            if score >= threshold:
                skill = skills[idx]
                matched[skill] = max(matched.get(skill, 0), score.item())

    # Keep only top_k distinct matches
    sorted_matches = sorted(matched.items(), key=lambda x: x[1], reverse=True)
    top_unique = []
    seen = set()

    for skill, score in sorted_matches:
        clean_skill = re.sub(r"\s*\([^)]*\)", "", skill).strip().lower()
        if clean_skill not in seen:
            top_unique.append((skill, score))
            seen.add(clean_skill)
        if len(top_unique) == top_k:
            break

    return top_unique

# 6. Run everything
if __name__ == "__main__":
    resume_path = "M VISHAL - RESUME.pdf"
    skills_csv = "skills.csv"

    print("📄 Extracting resume text...")
    resume_text = extract_text_from_pdf(resume_path)

    print("📛 Extracting name/email/phone...")
    contact = extract_contact_info(resume_text)

    print("📌 Selecting important lines from resume...")
    relevant_sentences = extract_relevant_sentences(resume_text)

    print("🧠 Loading model...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    print("📚 Loading skills and removing duplicates...")
    skills = load_unique_skills(skills_csv, model)

    print("🤖 Finding matched skills...")
    matched_skills = match_skills(relevant_sentences, skills, model)

    print("\n============================")
    print(f"👤 Name: {contact['name']}")
    print(f"📧 Email: {contact['email']}")
    print(f"📞 Phone: {contact['phone']}")
    print("\n✅ Top Unique Matched Skills:")
    for i, (skill, score) in enumerate(matched_skills, 1):
        print(f"{i:02d}. {skill.title()} (score: {score:.4f})")
    print("============================")